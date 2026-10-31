ALTER TABLE "OutboxEvent"
  ADD COLUMN "leaseToken" TEXT,
  ADD COLUMN "jobGeneration" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "RefundAttempt" (
  "id" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "paymentId" TEXT NOT NULL,
  "refundId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "processedAt" TIMESTAMP(3),
  "lastError" TEXT,
  CONSTRAINT "RefundAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RefundAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RefundAttempt_orderId_attemptNumber_key" ON "RefundAttempt"("orderId", "attemptNumber");
CREATE UNIQUE INDEX "RefundAttempt_refundId_key" ON "RefundAttempt"("refundId");
CREATE UNIQUE INDEX "RefundAttempt_idempotencyKey_key" ON "RefundAttempt"("idempotencyKey");
CREATE INDEX "RefundAttempt_orderId_status_idx" ON "RefundAttempt"("orderId", "status");

INSERT INTO "RefundAttempt" (
  "id", "orderId", "attemptNumber", "paymentId", "refundId", "idempotencyKey", "amount", "status", "requestedAt", "updatedAt", "processedAt", "lastError"
)
SELECT
  gen_random_uuid(),
  o."id",
  GREATEST(o."refundAttempts", 1),
  o."razorpayPaymentId",
  o."refundId",
  COALESCE(o."refundIdempotencyKey", 'tn-refund-' || o."id" || '-' || GREATEST(o."refundAttempts", 1)::text),
  COALESCE(o."refundAmount", ROUND(COALESCE(o."total", 0) * 100)::INTEGER),
  COALESCE(o."refundStatus", 'pending'),
  COALESCE(o."refundRequestedAt", CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP,
  o."refundProcessedAt",
  o."refundLastError"
FROM "Order" o
WHERE o."razorpayPaymentId" IS NOT NULL
  AND (o."refundStatus" IS NOT NULL OR o."refundId" IS NOT NULL OR o."paymentStatus" IN ('refund_pending', 'refunded'));

UPDATE "Order"
SET "refundAttempts" = GREATEST("refundAttempts", 1)
WHERE "razorpayPaymentId" IS NOT NULL
  AND ("refundStatus" IS NOT NULL OR "refundId" IS NOT NULL OR "paymentStatus" IN ('refund_pending', 'refunded'));
