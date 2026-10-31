import { randomInt } from "node:crypto";
import { Queue} from "bullmq";
import { prisma } from "../config/prisma.js";
import { redisConnection } from "../config/redis.js";

const RIDER_ASSIGNMENT_QUEUE = "rider-assignment";
const ASSIGNMENT_DELAY_MS = 5 * 60 * 1000;
const ACTIVE_DELIVERY_STATUSES = ["Assigned", "Packed", "Out for Delivery"];
const db = prisma as any;

export const riderAssignmentQueue = new Queue(RIDER_ASSIGNMENT_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});


export const scheduleRiderAssignment = async (orderId: string) => {
  if (typeof orderId !== "string" || !orderId.trim()) {
    throw new Error("A valid order ID is required to schedule rider assignment");
  }

  return riderAssignmentQueue.add(
    "auto-assign-rider",
    { orderId },
    {
      delay: ASSIGNMENT_DELAY_MS,
      // Avoid scheduling the same delayed assignment more than once per order.
      jobId: `auto-assign-rider-${orderId}`,
    },
  );
};

export const assignRiderAfterDelay = async (orderId: string) => {
  if (typeof orderId !== "string" || !orderId.trim()) {
    throw new Error("Rider assignment job has an invalid order ID");
  }

  return db.$transaction(async (tx: any) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return { skipped: true, reason: "Order not found" };
    if (order.deliveryPartnerId) return { skipped: true, reason: "Order already assigned" };
    if (order.status === "Cancelled" || order.status === "Delivered") {
      return { skipped: true, reason: `Order is ${order.status.toLowerCase()}` };
    }

    const busyOrders = await tx.order.findMany({
      where: {
        status: { in: ACTIVE_DELIVERY_STATUSES },
        deliveryPartnerId: { not: null },
      },
      select: { deliveryPartnerId: true },
    });
    const busyRiderIds = busyOrders.map((busyOrder: { deliveryPartnerId: string | null }) => busyOrder.deliveryPartnerId).filter(Boolean);
    const availableRider = await tx.deliveryPartner.findFirst({
      where: {
        isActive: true,
        ...(busyRiderIds.length ? { id: { notIn: busyRiderIds } } : {}),
      },
      orderBy: { createdAt: "asc" },
    });

    if (!availableRider) return { skipped: true, reason: "No available riders" };

    const otp = randomInt(100000, 1000000).toString();
    const history = Array.isArray(order.statusHistory) ? [...order.statusHistory] : [];
    history.push({
      status: "Assigned",
      note: `Auto-assigned to ${availableRider.name ?? "delivery rider"}`,
      timestamp: new Date().toISOString(),
    });

    // Recheck assignment and cancellation state when writing, so a concurrent
    // admin assignment or cancellation is not overwritten.
    const result = await tx.order.updateMany({
      where: {
        id: orderId,
        deliveryPartnerId: null,
        status: { notIn: ["Cancelled", "Delivered"] },
      },
      data: {
        deliveryPartnerId: availableRider.id,
        deliveryOtp: otp,
        status: "Assigned",
        statusHistory: history,
      },
    });

    if (result.count !== 1) return { skipped: true, reason: "Order changed before assignment" };

    return {
      assigned: true,
      orderId,
      riderId: availableRider.id,
      riderName: availableRider.name,
    };
  }, { isolationLevel: "Serializable" });
};

