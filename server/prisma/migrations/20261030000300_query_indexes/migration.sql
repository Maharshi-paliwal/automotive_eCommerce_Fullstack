CREATE INDEX "Address_userId_createdAt_idx" ON "Address"("userId", "createdAt");
CREATE INDEX "Product_stock_originalPrice_idx" ON "Product"("stock", "originalPrice");
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE INDEX "Order_deliveryPartnerId_status_createdAt_idx" ON "Order"("deliveryPartnerId", "status", "createdAt");
