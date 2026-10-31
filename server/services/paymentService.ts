import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { razorpay } from "../config/razorpay.js";
import type { Prisma } from "../generated/prisma/client.js";

const db = prisma;

const isValidSignature = (value: string, expected: Buffer) => {
  if (!/^[a-f0-9]{64}$/i.test(value)) return false;
  const received = Buffer.from(value, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
};

export const verifyCheckoutSignature = (orderId: string, paymentId: string, signature: string, secret: string) => {
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest();
  return isValidSignature(signature, expected);
};

export const verifyWebhookSignature = (rawBody: Buffer, signature: string, secret: string) => {
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  return isValidSignature(signature, expected);
};

type RecordPaymentResult =
  | { kind: "paid" | "already-paid"; orderId: string }
  | { kind: "expired"; orderId: string; refundStatus: string | null }
  | { kind: "payment-conflict" }
  | { kind: "wrong-payment-method" }
  | { kind: "invalid-payment-details" }
  | { kind: "gateway-error" }
  | { kind: "not-found" };

export const recordGatewayPaymentInTransaction = async (tx: Prisma.TransactionClient, input: {
  razorpayOrderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  userId?: string;
}): Promise<RecordPaymentResult> => {
  let order = await tx.order.findFirst({
    where: { razorpayOrderId: input.razorpayOrderId, ...(input.userId ? { userId: input.userId } : {}) },
  });
  if (!order) return { kind: "not-found" };
  if (order.paymentMethod !== "card") return { kind: "wrong-payment-method" };
  if (input.amount !== Math.round(Number(order.total) * 100) || input.currency !== "INR") return { kind: "payment-conflict" };

  if (order.isPaid) {
    return order.razorpayPaymentId === input.paymentId
      ? { kind: "already-paid", orderId: order.id }
      : { kind: "payment-conflict" };
  }

  if (order.status !== "Placed" && order.razorpayPaymentId === input.paymentId) {
    return { kind: "expired", orderId: order.id, refundStatus: order.refundStatus };
  }

  const isActive = order.status === "Placed";
  if (isActive) {
    const updated = await tx.order.updateMany({
      where: {
        id: order.id,
        paymentMethod: "card",
        isPaid: false,
        status: "Placed",
        razorpayOrderId: input.razorpayOrderId,
        ...(order.razorpayPaymentId ? { razorpayPaymentId: order.razorpayPaymentId } : { razorpayPaymentId: null }),
      },
      data: {
        isPaid: true,
        paymentStatus: "paid",
        razorpayPaymentId: input.paymentId,
        paymentReceivedAt: new Date(),
      },
    });
    if (updated.count === 1) {
      const now = new Date();
      await tx.outboxEvent.createMany({ data: [
        { dedupeKey: `order:${order.id}:process`, queue: "order-processing", jobName: "process-order", payload: { orderId: order.id }, availableAt: now },
        { dedupeKey: `order:${order.id}:rider`, queue: "rider-assignment", jobName: "auto-assign-rider", payload: { orderId: order.id }, availableAt: new Date(now.getTime() + 5 * 60 * 1000) },
      ] });
      return { kind: "paid", orderId: order.id };
    }
    order = await tx.order.findUnique({ where: { id: order.id } });
    if (!order) return { kind: "not-found" };
    if (order.isPaid) {
      return order.razorpayPaymentId === input.paymentId
        ? { kind: "already-paid", orderId: order.id }
        : { kind: "payment-conflict" };
    }
  }

  // A valid payment for a cancelled/non-active order is recorded for refund,
  // but can never transition the order back to paid or active.
  if (order.razorpayPaymentId && order.razorpayPaymentId !== input.paymentId) return { kind: "payment-conflict" };
  if (order.razorpayPaymentId === input.paymentId) {
    return { kind: "expired", orderId: order.id, refundStatus: order.refundStatus };
  }
  const attemptNumber = order.refundAttempts + 1;
  const idempotencyKey = `tn-refund-${order.id}-${attemptNumber}`;
  const updated = await tx.order.updateMany({
    where: {
      id: order.id,
      isPaid: false,
      status: order.status,
      paymentMethod: "card",
      razorpayPaymentId: null,
    },
    data: {
      razorpayPaymentId: input.paymentId,
      paymentStatus: "refund_pending",
      paymentReceivedAt: new Date(),
      refundStatus: order.refundStatus === "processed" ? "processed" : "pending",
      refundAmount: Math.round(Number(order.total) * 100),
      refundAttempts: attemptNumber,
      refundIdempotencyKey: idempotencyKey,
      refundRequestedAt: order.refundRequestedAt ?? new Date(),
    },
  });
  if (updated.count !== 1) {
    // A concurrent notification may have recorded this same payment after our
    // initial read. Re-read inside the transaction and return its state without
    // allocating another attempt or reopening its outbox event.
    const current = await tx.order.findUnique({ where: { id: order.id } });
    if (current?.status !== "Placed" && current?.razorpayPaymentId === input.paymentId) {
      return { kind: "expired", orderId: current.id, refundStatus: current.refundStatus };
    }
    return { kind: "payment-conflict" };
  }
  await tx.refundAttempt.upsert({
    where: { orderId_attemptNumber: { orderId: order.id, attemptNumber } },
    create: {
      orderId: order.id,
      attemptNumber,
      paymentId: input.paymentId,
      amount: Math.round(Number(order.total) * 100),
      idempotencyKey,
      status: "pending",
    },
    update: {},
  });
  await tx.outboxEvent.upsert({
    where: { dedupeKey: `refund:${order.id}:attempt:${attemptNumber}` },
    create: {
      dedupeKey: `refund:${order.id}:attempt:${attemptNumber}`, queue: "order-processing", jobName: "refund-expired-payment",
      payload: { orderId: order.id, attemptNumber }, availableAt: new Date(),
    },
    update: { processedAt: null, availableAt: new Date(), lastError: null },
  });
  return { kind: "expired", orderId: order.id, refundStatus: "pending" };
};

export const recordGatewayPayment = async (input: {
  razorpayOrderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  userId?: string;
}) => db.$transaction((tx) => recordGatewayPaymentInTransaction(tx, input));

export const verifyAndRecordPayment = async (input: {
  userId: string;
  orderId: string;
  paymentId: string;
  signature: string;
}) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return { kind: "not-configured" as const };
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(input.orderId) || !/^[a-zA-Z0-9_-]{1,80}$/.test(input.paymentId)) {
    return { kind: "not-found" as const };
  }
  if (!verifyCheckoutSignature(input.orderId, input.paymentId, input.signature, secret)) {
    return { kind: "invalid-signature" as const };
  }
  const order = await db.order.findFirst({
    where: { razorpayOrderId: input.orderId, userId: input.userId },
    select: { id: true, total: true, paymentMethod: true },
  });
  if (!order) return { kind: "not-found" as const };
  if (order.paymentMethod !== "card") return { kind: "wrong-payment-method" as const };
  if (!razorpay) return { kind: "not-configured" as const };

  let payment;
  try {
    payment = await razorpay.payments.fetch(input.paymentId);
  } catch {
    return { kind: "gateway-error" as const };
  }
  if (
    payment.id !== input.paymentId ||
    payment.order_id !== input.orderId ||
    payment.amount !== Math.round(Number(order.total) * 100) ||
    payment.currency !== "INR" ||
    payment.status !== "captured"
  ) return { kind: "invalid-payment-details" as const };

  return recordGatewayPayment({
    razorpayOrderId: input.orderId,
    paymentId: input.paymentId,
    amount: payment.amount,
    currency: payment.currency,
    userId: input.userId,
  });
};
