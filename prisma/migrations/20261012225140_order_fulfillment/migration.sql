-- CreateEnum
CREATE TYPE "Carrier" AS ENUM ('USPS', 'UPS', 'FEDEX', 'OTHER');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "carrier" "Carrier",
ADD COLUMN     "fulfilledAt" TIMESTAMP(3),
ADD COLUMN     "fulfilledById" INTEGER,
ADD COLUMN     "trackingNumber" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_fulfilledById_fkey" FOREIGN KEY ("fulfilledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Hand-written: CHECK constraints Prisma's schema language can't express.

-- Shipment details are recorded all at once or not at all, and a FULFILLED
-- order always has them. Other statuses may keep them (e.g. a later refund).
ALTER TABLE "Order" ADD CONSTRAINT "Order_fulfillment_check"
  CHECK (
    (
      ("carrier" IS NULL AND "trackingNumber" IS NULL AND "fulfilledAt" IS NULL)
      OR ("carrier" IS NOT NULL AND "trackingNumber" IS NOT NULL AND "fulfilledAt" IS NOT NULL)
    )
    AND ("status" <> 'FULFILLED' OR "fulfilledAt" IS NOT NULL)
    AND ("trackingNumber" IS NULL OR length("trackingNumber") > 0)
  );
