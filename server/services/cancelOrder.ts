import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../config/prisma.js";

const db = prisma;
const ACTIVE_DELIVERY_STATUSES = ["Assigned", "Packed", "Out for Delivery"];

export type CancelOrderResult =
  | { kind: "cancelled"; order: unknown }
  | { kind: "not-found" }
  | { kind: "conflict" };

/** Shared cancellation workflow for admin and delivery-partner initiated cancellations. */
export const cancelOrder = async (input: {
  orderId: string;
  reason?: string;
  deliveryPartnerId?: string;
}): Promise<CancelOrderResult> => db.$transaction(async (tx: Prisma.TransactionClient): Promise<CancelOrderResult> => {
  const order = await tx.order.findFirst({
    where: {
      id: input.orderId,
      ...(input.deliveryPartnerId ? { deliveryPartnerId: input.deliveryPartnerId } : {}),
    },
  });
  if (!order) return { kind: "not-found" };
  if (!order.status || order.status === "Delivered" || order.status === "Cancelled" ||
      (input.deliveryPartnerId && !ACTIVE_DELIVERY_STATUSES.includes(order.status))) {
    return { kind: "conflict" };
  }

  const paidCardOrder = order.paymentMethod === "card" && order.isPaid === true;
  if (paidCardOrder && (!order.razorpayPaymentId || order.refundStatus === "processed")) {
    return { kind: "conflict" };
  }

  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  const updated = await tx.order.updateMany({
    where: {
      id: input.orderId,
      status: order.status,
      isPaid: order.isPaid,
      paymentMethod: order.paymentMethod,
      ...(input.deliveryPartnerId ? { deliveryPartnerId: input.deliveryPartnerId } : {}),
    },
    data: {
      status: "Cancelled",
      statusHistory: [...history, { status: "Cancelled", note: input.reason || "", timestamp: new Date().toISOString() }],
      deliveryOtp: "",
      ...(paidCardOrder ? { paymentStatus: "refund_pending", refundStatus: "pending" } : {}),
    },
  });
  if (updated.count !== 1) return { kind: "conflict" };

  for (const item of Array.isArray(order.items) ? order.items : []) {
    if (!item || typeof item !== "object" || Array.isArray(item) || !("product" in item) || !("quantity" in item)) continue;
    const productId = item.product;
    const quantity = item.quantity;
    if (typeof productId === "string" && typeof quantity === "number" && Number.isInteger(quantity) && quantity > 0) {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) continue;
      if (product.stock === null) {
        await tx.inventoryMovement.create({ data: {
          productId, movementType: "ORDER_CANCELLATION_RESTORATION", quantityChange: null,
          stockBefore: null, stockAfter: null, reason: "Restoration skipped because stock was unknown", relatedOrderId: order.id,
        }});
        continue;
      }
      const changedStock = await tx.product.updateMany({ where: { id: productId, stock: product.stock }, data: { stock: { increment: quantity } } });
      if (changedStock.count !== 1) throw new Error("Product stock changed during cancellation");
      await tx.inventoryMovement.create({ data: {
        productId, movementType: "ORDER_CANCELLATION_RESTORATION", quantityChange: quantity,
        stockBefore: product.stock, stockAfter: product.stock + quantity,
        reason: input.reason?.trim() || "Stock restored for cancelled order", relatedOrderId: order.id,
      }});
    }
  }

  if (paidCardOrder) {
    const attemptNumber = order.refundAttempts + 1;
    const amount = Math.round(Number(order.total) * 100);
    const idempotencyKey = `tn-refund-${order.id}-${attemptNumber}`;
    const refundState = await tx.order.updateMany({
      where: { id: order.id, status: "Cancelled", refundAttempts: order.refundAttempts },
      data: { refundAttempts: attemptNumber, refundAmount: amount, refundIdempotencyKey: idempotencyKey, refundRequestedAt: new Date() },
    });
    if (refundState.count !== 1) throw new Error("Could not persist the cancellation refund state");
    await tx.refundAttempt.create({
      data: { orderId: order.id, attemptNumber, paymentId: order.razorpayPaymentId!, amount, idempotencyKey, status: "pending" },
    });
    await tx.outboxEvent.create({
      data: {
        dedupeKey: `refund:${order.id}:attempt:${attemptNumber}`,
        queue: "order-processing",
        jobName: "refund-expired-payment",
        payload: { orderId: order.id, attemptNumber },
        availableAt: new Date(),
      },
    });
  }

  const cancelledOrder = await tx.order.findUnique({ where: { id: input.orderId } });
  return { kind: "cancelled", order: cancelledOrder };
}, { isolationLevel: "Serializable" }).catch((error): CancelOrderResult => {
  if ((error instanceof Error && error.message.includes("stock changed during cancellation")) ||
      (error && typeof error === "object" && "code" in error && error.code === "P2034")) return { kind: "conflict" };
  throw error;
});
