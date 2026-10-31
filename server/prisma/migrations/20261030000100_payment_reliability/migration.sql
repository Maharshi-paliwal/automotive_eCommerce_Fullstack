ALTER TABLE "Order"
  ADD COLUMN "paymentStatus" TEXT DEFAULT 'pending',
  ADD COLUMN "paymentReceivedAt" TIMESTAMP(3),
  ADD COLUMN "refundId" TEXT,
  ADD COLUMN "refundStatus" TEXT,
  ADD COLUMN "refundAmount" INTEGER,
  ADD COLUMN "refundIdempotencyKey" TEXT,
  ADD COLUMN "refundRequestedAt" TIMESTAMP(3),
  ADD COLUMN "refundProcessedAt" TIMESTAMP(3),
  ADD COLUMN "refundAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "refundLastError" TEXT;

CREATE UNIQUE INDEX "Order_refundId_key" ON "Order"("refundId");

CREATE TABLE "OutboxEvent" (
  "id" UUID NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "queue" TEXT NOT NULL,
  "jobName" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedUntil" TIMESTAMP(3),
  "processedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OutboxEvent_dedupeKey_key" ON "OutboxEvent"("dedupeKey");
CREATE INDEX "OutboxEvent_processedAt_availableAt_idx" ON "OutboxEvent"("processedAt", "availableAt");

CREATE TABLE "WebhookEvent" (
  "eventId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("eventId")
);
