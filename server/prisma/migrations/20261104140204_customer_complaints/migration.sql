-- CreateEnum
CREATE TYPE "ComplaintCategory" AS ENUM ('ORDER', 'PRODUCT', 'PAYMENT', 'DELIVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');


-- CreateTable
CREATE TABLE "Complaint" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "category" "ComplaintCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Complaint_userId_createdAt_idx" ON "Complaint"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Complaint_status_createdAt_idx" ON "Complaint"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_userId_idempotencyKey_key" ON "Complaint"("userId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
