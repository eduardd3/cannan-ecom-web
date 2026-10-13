-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "trackingUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "trackingUpdatedById" INTEGER;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_trackingUpdatedById_fkey" FOREIGN KEY ("trackingUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Hand-written: CHECK constraints Prisma's schema language can't express.

-- Tracking can only be corrected on an order that has shipped.
ALTER TABLE "Order" ADD CONSTRAINT "Order_tracking_updated_check"
  CHECK ("trackingUpdatedAt" IS NULL OR "fulfilledAt" IS NOT NULL);
