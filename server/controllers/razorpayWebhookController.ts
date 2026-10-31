import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { verifyWebhookSignature, recordGatewayPaymentInTransaction } from "../services/paymentService.js";

const db = prisma;

class MalformedSupportedEvent extends Error {}
class RetryableWebhookFailure extends Error {}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const isDuplicateEvent = (error: unknown) => {
  const record = asRecord(error);
  const meta = asRecord(record?.meta);
  const target = meta?.target;
  return record?.code === "P2002" && (target === "eventId" || (Array.isArray(target) && target.includes("eventId")));
};

const requiredString = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new MalformedSupportedEvent(`Invalid ${key}`);
  return value;
};

const requiredAmount = (record: Record<string, unknown>) => {
  const amount = record.amount;
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 0) throw new MalformedSupportedEvent("Invalid amount");
  return amount;
};

const paymentEntity = (payload: Record<string, unknown>) => {
  const entity = asRecord(asRecord(payload.payment)?.entity);
  if (!entity) throw new MalformedSupportedEvent("Missing payment entity");
  return entity;
};

const refundEntity = (payload: Record<string, unknown>) => {
  const entity = asRecord(asRecord(payload.refund)?.entity);
  if (!entity) throw new MalformedSupportedEvent("Missing refund entity");
  return entity;
};

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  const rawBody = req.body;
  const signature = req.header("x-razorpay-signature");
  const eventId = req.header("x-razorpay-event-id");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!Buffer.isBuffer(rawBody) || !signature || !eventId || !/^[a-zA-Z0-9_-]{1,200}$/.test(eventId) || !secret) {
    return res.status(400).json({ message: "Invalid webhook request" });
  }
  if (!verifyWebhookSignature(rawBody, signature, secret)) return res.status(400).json({ message: "Invalid webhook signature" });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawBody.toString("utf8"));
    body = asRecord(parsed) ?? {};
  } catch {
    return res.status(400).json({ message: "Invalid webhook payload" });
  }
  if (typeof body.event !== "string" || !body.event) return res.status(400).json({ message: "Invalid webhook event" });
  const payload = asRecord(body.payload) ?? {};

  try {
    await db.$transaction(async (tx) => {
      await tx.webhookEvent.create({ data: { eventId, event: body.event as string } });

      if (body.event === "payment.captured") {
        const entity = paymentEntity(payload);
        const paymentId = requiredString(entity, "id");
        const orderId = requiredString(entity, "order_id");
        const amount = requiredAmount(entity);
        if (entity.currency !== "INR" || entity.status !== "captured") throw new MalformedSupportedEvent("Payment capture fields are invalid");
        const result = await recordGatewayPaymentInTransaction(tx, { razorpayOrderId: orderId, paymentId, amount, currency: "INR" });
        if (result.kind === "not-found") throw new RetryableWebhookFailure("Captured payment order is not persisted yet");
        if (result.kind === "wrong-payment-method" || result.kind === "payment-conflict") throw new MalformedSupportedEvent("Captured payment does not match its order");
      } else if (body.event === "payment.failed") {
        const entity = paymentEntity(payload);
        const paymentId = requiredString(entity, "id");
        const orderId = requiredString(entity, "order_id");
        const amount = requiredAmount(entity);
        if (entity.currency !== "INR" || entity.status !== "failed") throw new MalformedSupportedEvent("Payment failure fields are invalid");
        const order = await tx.order.findFirst({ where: { razorpayOrderId: orderId } });
        if (!order) throw new RetryableWebhookFailure("Failed payment order is not persisted yet");
        if (order.paymentMethod !== "card" || amount !== Math.round(Number(order.total) * 100)) throw new MalformedSupportedEvent("Failed payment does not match its order");
        await tx.order.updateMany({
          where: { id: order.id, isPaid: false, paymentMethod: "card", paymentStatus: "pending" },
          data: { paymentStatus: "failed" },
        });
        void paymentId;
      } else if (body.event === "refund.processed" || body.event === "refund.failed") {
        const entity = refundEntity(payload);
        const refundId = requiredString(entity, "id");
        const paymentId = requiredString(entity, "payment_id");
        const amount = requiredAmount(entity);
        const expectedStatus = body.event === "refund.processed" ? "processed" : "failed";
        if (entity.status !== expectedStatus) throw new MalformedSupportedEvent("Refund status does not match its event");

        const order = await tx.order.findFirst({ where: { razorpayPaymentId: paymentId } });
        if (!order) throw new RetryableWebhookFailure("Refund payment is not associated with a local order yet");
        if (order.paymentMethod !== "card" || order.refundAmount !== amount) throw new MalformedSupportedEvent("Refund amount or payment association is invalid");

        let attempt = await tx.refundAttempt.findUnique({ where: { refundId } });
        if (!attempt) {
          const latest = await tx.refundAttempt.findFirst({ where: { orderId: order.id }, orderBy: { attemptNumber: "desc" } });
          if (!latest || latest.paymentId !== paymentId || latest.amount !== amount || latest.refundId || latest.status !== "pending") {
            throw new MalformedSupportedEvent("Refund event does not match a pending refund attempt");
          }
          const linked = await tx.refundAttempt.updateMany({
            where: { id: latest.id, status: "pending", refundId: null },
            data: { refundId },
          });
          attempt = await tx.refundAttempt.findUnique({ where: { refundId } });
          if (linked.count !== 1 && !attempt) throw new RetryableWebhookFailure("Refund attempt changed while processing webhook");
        }
        if (!attempt || attempt.orderId !== order.id || attempt.paymentId !== paymentId || attempt.amount !== amount) {
          throw new MalformedSupportedEvent("Refund event is not associated with the expected attempt");
        }

        const isCurrentAttempt = attempt.attemptNumber === order.refundAttempts;
        if (body.event === "refund.processed") {
          await tx.refundAttempt.updateMany({
            where: { id: attempt.id, status: { not: "processed" } },
            data: { status: "processed", refundId, processedAt: new Date(), lastError: null },
          });
          // A completed refund is terminal even if an older attempt's event is delayed.
          await tx.order.updateMany({
            where: { id: order.id, refundStatus: { not: "processed" } },
            data: { paymentStatus: "refunded", refundStatus: "processed", refundId, refundProcessedAt: new Date(), refundLastError: null },
          });
        } else {
          const changed = await tx.refundAttempt.updateMany({
            where: { id: attempt.id, status: "pending" },
            data: { status: "failed", refundId, processedAt: null, lastError: "Razorpay reported that the refund failed" },
          });
          if (changed.count === 1 && isCurrentAttempt) {
            const current = await tx.order.updateMany({
              where: { id: order.id, refundAttempts: attempt.attemptNumber, refundStatus: { not: "processed" } },
              data: { refundStatus: "failed", paymentStatus: "refund_failed", refundId, refundLastError: "Razorpay reported that the refund failed" },
            });
            if (current.count === 1) {
              const nextAttempt = attempt.attemptNumber + 1;
              await tx.outboxEvent.upsert({
                where: { dedupeKey: `refund:${order.id}:attempt:${nextAttempt}:retry` },
                create: {
                  dedupeKey: `refund:${order.id}:attempt:${nextAttempt}:retry`,
                  queue: "order-processing", jobName: "refund-expired-payment",
                  payload: { orderId: order.id, attemptNumber: nextAttempt },
                  availableAt: new Date(Date.now() + 5000),
                },
                update: { processedAt: null, lockedUntil: null, leaseToken: null, availableAt: new Date(Date.now() + 5000), lastError: null },
              });
            }
          }
        }
      }

      await tx.webhookEvent.update({ where: { eventId }, data: { processedAt: new Date() } });
    });
    return res.status(200).json({ received: true });
  } catch (error) {
    if (isDuplicateEvent(error)) return res.status(200).json({ received: true, duplicate: true });
    if (error instanceof MalformedSupportedEvent) return res.status(400).json({ message: "Malformed Razorpay event" });
    if (error instanceof RetryableWebhookFailure) return res.status(503).json({ message: "Webhook processing can be retried" });
    throw error;
  }
};
