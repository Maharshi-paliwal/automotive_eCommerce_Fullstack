import { Worker, type Job } from "bullmq";
import { prisma } from "../config/prisma.js";
import { redisConnection } from "../config/redis.js";
import { createIdempotentRefund, razorpay } from "../config/razorpay.js";
import { retryOutboxJob } from "./outboxDispatcher.js";

const db = prisma;

const processOrder = async (orderId: string) => {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error(`Order ${orderId} was not found`);
  if (order.status !== "Placed") return;
  const eligiblePayment = order.paymentMethod === "cash" || (order.paymentMethod === "card" && order.isPaid);
  if (!eligiblePayment) return;

  const history = Array.isArray(order.statusHistory) ? [...order.statusHistory] : [];
  history.push({ status: "Confirmed", note: "Order accepted for processing", timestamp: new Date().toISOString() });
  await db.order.updateMany({
    where: {
      id: orderId,
      status: "Placed",
      OR: [{ paymentMethod: "cash" }, { paymentMethod: "card", isPaid: true }],
    },
    data: { status: "Confirmed", statusHistory: history },
  });
};

export const expireUnpaidOrder = async (orderId: string) => db.$transaction(async (tx) => {
  const order = await tx.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentMethod !== "card" || order.isPaid || order.status !== "Placed") return;
  const history = Array.isArray(order.statusHistory) ? [...order.statusHistory] : [];
  history.push({ status: "Cancelled", note: "Payment was not completed within 15 minutes", timestamp: new Date().toISOString() });
  const cancelled = await tx.order.updateMany({
    where: { id: orderId, paymentMethod: "card", isPaid: false, status: "Placed" },
    data: { status: "Cancelled", statusHistory: history },
  });
  if (cancelled.count !== 1) return;
  for (const item of Array.isArray(order.items) ? order.items : []) {
    if (item && typeof item === "object" && !Array.isArray(item) && "product" in item && "quantity" in item) {
      const productId = item.product;
      const quantity = item.quantity;
      if (typeof productId === "string" && typeof quantity === "number" && Number.isInteger(quantity) && quantity > 0) {
        await tx.product.updateMany({ where: { id: productId }, data: { stock: { increment: quantity } } });
      }
    }
  }
});

const enqueueRefundJob = async (orderId: string, attemptNumber: number, suffix: string, delay: number) => {
  const dedupeKey = `refund:${orderId}:attempt:${attemptNumber}:${suffix}`;
  const availableAt = new Date(Date.now() + delay);
  await db.outboxEvent.upsert({
    where: { dedupeKey },
    create: {
      dedupeKey, queue: "order-processing", jobName: "refund-expired-payment",
      payload: { orderId, attemptNumber }, availableAt,
    },
    update: { processedAt: null, lockedUntil: null, leaseToken: null, availableAt, lastError: null },
  });
};

const markAttemptState = async (attemptId: string, orderId: string, attemptNumber: number, status: string, refundId: string | null, errorMessage: string | null) => db.$transaction(async (tx) => {
  const attemptUpdate = await tx.refundAttempt.updateMany({
    where: {
      id: attemptId,
      status: status === "processed" ? { in: ["pending", "failed", "review_required"] } : "pending",
    },
    data: {
      status,
      ...(refundId ? { refundId } : {}),
      processedAt: status === "processed" ? new Date() : null,
      lastError: errorMessage,
    },
  });
  if (attemptUpdate.count !== 1) return false;

  const current = await tx.order.updateMany({
    where: { id: orderId, refundAttempts: attemptNumber, refundStatus: { not: "processed" } },
    data: {
      refundId,
      refundStatus: status,
      paymentStatus: status === "processed" ? "refunded" : status === "failed" ? "refund_failed" : status === "review_required" ? "refund_review" : "refund_pending",
      refundProcessedAt: status === "processed" ? new Date() : null,
      refundLastError: errorMessage,
    },
  });
  return current.count === 1;
});

const processExpiredPaymentRefund = async (orderId: string, requestedAttemptNumber?: number) => {
  if (!razorpay) throw new Error("Razorpay refund processing is not configured");
  let attempt = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "Cancelled" || order.paymentMethod !== "card" || !order.razorpayPaymentId) return null;
    if (order.refundStatus === "processed") return null;

    const completed = await tx.refundAttempt.findFirst({ where: { orderId, status: "processed" }, orderBy: { attemptNumber: "desc" } });
    if (completed) {
      await tx.order.updateMany({ where: { id: orderId, refundStatus: { not: "processed" } }, data: { paymentStatus: "refunded", refundStatus: "processed", refundId: completed.refundId, refundProcessedAt: completed.processedAt ?? new Date() } });
      return null;
    }

    let latest = await tx.refundAttempt.findFirst({ where: { orderId }, orderBy: { attemptNumber: "desc" } });
    if (!latest && order.refundIdempotencyKey && order.refundAmount) {
      const attemptNumber = Math.max(order.refundAttempts, 1);
      latest = await tx.refundAttempt.create({ data: {
        orderId, attemptNumber, paymentId: order.razorpayPaymentId, refundId: order.refundId,
        idempotencyKey: order.refundIdempotencyKey, amount: order.refundAmount,
        status: order.refundStatus === "failed" ? "failed" : order.refundStatus === "processed" ? "processed" : "pending",
        processedAt: order.refundProcessedAt, lastError: order.refundLastError,
      } });
      if (order.refundAttempts < attemptNumber) await tx.order.update({ where: { id: orderId }, data: { refundAttempts: attemptNumber } });
    }
    if (!latest) {
      const attemptNumber = order.refundAttempts + 1;
      latest = await tx.refundAttempt.upsert({
        where: { orderId_attemptNumber: { orderId, attemptNumber } },
        create: {
          orderId, attemptNumber, paymentId: order.razorpayPaymentId,
          amount: Math.round(Number(order.total) * 100),
          idempotencyKey: `tn-refund-${orderId}-${attemptNumber}`,
          status: "pending",
        },
        update: {},
      });
      await tx.order.updateMany({
        where: { id: orderId, isPaid: order.isPaid, status: "Cancelled", refundAttempts: { lte: attemptNumber } },
        data: {
          refundAttempts: attemptNumber,
          refundId: latest.refundId,
          refundIdempotencyKey: latest.idempotencyKey,
          refundAmount: latest.amount,
          refundStatus: latest.status,
          refundLastError: latest.lastError,
          refundRequestedAt: order.refundRequestedAt ?? new Date(),
        },
      });
    } else if (latest.status === "failed") {
      const attemptNumber = latest.attemptNumber + 1;
      latest = await tx.refundAttempt.upsert({
        where: { orderId_attemptNumber: { orderId, attemptNumber } },
        create: {
          orderId, attemptNumber, paymentId: order.razorpayPaymentId,
          amount: latest.amount,
          idempotencyKey: `tn-refund-${orderId}-${attemptNumber}`,
          status: "pending",
        },
        update: {},
      });
      await tx.order.updateMany({
        where: { id: orderId, isPaid: order.isPaid, status: "Cancelled", refundAttempts: { lt: attemptNumber } },
        data: {
          refundAttempts: attemptNumber, refundId: null, refundIdempotencyKey: latest.idempotencyKey,
          refundStatus: "pending", paymentStatus: "refund_pending", refundLastError: null,
        },
      });
    }
    if (requestedAttemptNumber !== undefined && latest.attemptNumber !== requestedAttemptNumber) return null;
    return latest;
  });

  if (!attempt || attempt.status === "processed" || attempt.status === "review_required") return;
  if (attempt.status === "failed") {
    await enqueueRefundJob(orderId, attempt.attemptNumber + 1, "retry", Math.min(60 * 60_000, 1000 * 2 ** Math.min(attempt.attemptNumber, 12)));
    return;
  }

  if (attempt.refundId) {
    let existingRefund;
    try {
      existingRefund = await razorpay.refunds.fetch(attempt.refundId);
    } catch {
      throw new Error("Could not fetch existing Razorpay refund");
    }
    if (existingRefund.id !== attempt.refundId || existingRefund.payment_id !== attempt.paymentId || existingRefund.amount !== attempt.amount) {
      await markAttemptState(attempt.id, orderId, attempt.attemptNumber, "review_required", attempt.refundId, "Razorpay refund details did not match the stored attempt");
      return;
    }
    if (existingRefund.status === "processed") {
      await markAttemptState(attempt.id, orderId, attempt.attemptNumber, "processed", attempt.refundId, null);
      return;
    }
    if (existingRefund.status === "pending") {
      await markAttemptState(attempt.id, orderId, attempt.attemptNumber, "pending", attempt.refundId, null);
      await enqueueRefundJob(orderId, attempt.attemptNumber, "poll", 60_000);
      return;
    }
    if (existingRefund.status === "failed") {
      const current = await markAttemptState(attempt.id, orderId, attempt.attemptNumber, "failed", attempt.refundId, "Razorpay reported that the refund failed");
      if (current) await enqueueRefundJob(orderId, attempt.attemptNumber + 1, "retry", 5_000);
      return;
    }
    await markAttemptState(attempt.id, orderId, attempt.attemptNumber, "review_required", attempt.refundId, "Razorpay returned an unsupported refund status");
    return;
  }

  let refund;
  try {
    refund = await createIdempotentRefund(attempt.paymentId, attempt.amount, attempt.idempotencyKey);
  } catch {
    await db.refundAttempt.updateMany({
      where: { id: attempt.id, status: "pending" },
      data: { lastError: "Razorpay refund submission failed; safe retry will reuse the same idempotency key" },
    });
    throw new Error("Razorpay refund submission failed");
  }
  if (refund.payment_id !== attempt.paymentId || refund.amount !== attempt.amount) {
    await markAttemptState(attempt.id, orderId, attempt.attemptNumber, "review_required", refund.id, "Razorpay refund response did not match the stored attempt");
    return;
  }
  if (refund.status === "processed" || refund.status === "pending" || refund.status === "failed") {
    const current = await markAttemptState(attempt.id, orderId, attempt.attemptNumber, refund.status, refund.id, refund.status === "failed" ? "Razorpay reported that the refund failed" : null);
    if (!current) return;
    if (refund.status === "pending") await enqueueRefundJob(orderId, attempt.attemptNumber, "poll", 60_000);
    if (refund.status === "failed") await enqueueRefundJob(orderId, attempt.attemptNumber + 1, "retry", 5_000);
    return;
  }
  await markAttemptState(attempt.id, orderId, attempt.attemptNumber, "review_required", refund.id, "Razorpay returned an unsupported refund status");
};

export const processOrderJob = async (job: Pick<Job, "name" | "data">) => {
  if (!["process-order", "expire-unpaid-order", "refund-expired-payment"].includes(job.name)) {
    throw new Error(`Unknown job type: ${job.name}`);
  }
  const { orderId, attemptNumber } = job.data as { orderId?: unknown; attemptNumber?: unknown };
  if (typeof orderId !== "string" || !orderId.trim()) throw new Error("Order job has an invalid order ID");
  if (attemptNumber !== undefined && (typeof attemptNumber !== "number" || !Number.isInteger(attemptNumber) || attemptNumber < 1)) {
    throw new Error("Refund job has an invalid attempt number");
  }
  switch (job.name) {
    case "process-order": return processOrder(orderId);
    case "expire-unpaid-order": return expireUnpaidOrder(orderId);
    case "refund-expired-payment": return processExpiredPaymentRefund(orderId, attemptNumber);
    default: throw new Error(`Unknown job type: ${job.name}`);
  }
};

export const orderWorker = new Worker("order-processing", processOrderJob, {
  connection: redisConnection,
  concurrency: 5,
});

orderWorker.on("failed", async (job, error) => {
  console.error(`Order job ${job?.id} failed:`, error.message);
  if (job && job.attemptsMade >= Number(job.opts.attempts ?? 1)) {
    await retryOutboxJob(job.id).catch((outboxError) => console.error("Could not schedule outbox retry:", outboxError instanceof Error ? outboxError.message : "unknown error"));
  }
});
