CREATE TYPE "InventoryMovementType" AS ENUM (
  'INITIAL_STOCK', 'ORDER_DEDUCTION', 'MANUAL_ADJUSTMENT',
  'ORDER_CANCELLATION_RESTORATION', 'UNPAID_ORDER_EXPIRY_RESTORATION'
);

CREATE TABLE "InventoryMovement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "productId" UUID,
  "movementType" "InventoryMovementType" NOT NULL,
  "quantityChange" INTEGER,
  "stockBefore" INTEGER,
  "stockAfter" INTEGER,
  "reason" TEXT NOT NULL,
  "adminActorId" UUID,
  "relatedOrderId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "InventoryMovement_adminActorId_fkey" FOREIGN KEY ("adminActorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "InventoryMovement_relatedOrderId_fkey" FOREIGN KEY ("relatedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "InventoryMovement_productId_createdAt_idx" ON "InventoryMovement"("productId", "createdAt");
CREATE INDEX "InventoryMovement_relatedOrderId_movementType_idx" ON "InventoryMovement"("relatedOrderId", "movementType");
