-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippedEmailSentAt" TIMESTAMP(3);

-- Hand-written: CHECK constraints Prisma's schema language can't express.

-- The shipped email follows the shipment: an order that never shipped can't
-- have one. fulfilledAt is kept after a later status change, so this holds
-- for a shipped order that's since been refunded.
ALTER TABLE "Order" ADD CONSTRAINT "Order_shipped_email_check"
  CHECK ("shippedEmailSentAt" IS NULL OR "fulfilledAt" IS NOT NULL);
