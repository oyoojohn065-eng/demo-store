-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'test';
ALTER TABLE "Order" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Order" ADD COLUMN "phone" TEXT;
ALTER TABLE "Order" ADD COLUMN "checkoutRequestId" TEXT;
ALTER TABLE "Order" ADD COLUMN "mpesaReceipt" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentDetail" TEXT;
ALTER TABLE "Order" ADD COLUMN "stockReduced" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Order_checkoutRequestId_key" ON "Order"("checkoutRequestId");
