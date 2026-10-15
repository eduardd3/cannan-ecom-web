-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "disputeReason" TEXT,
ADD COLUMN     "disputeStatus" TEXT,
ADD COLUMN     "disputedAt" TIMESTAMP(3),
ADD COLUMN     "refundedCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stripeDisputeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeDisputeId_key" ON "Order"("stripeDisputeId");

-- Hand-written: CHECK constraints Prisma's schema language can't express.

-- Mirrors Stripe's amount_refunded, which is never negative.
ALTER TABLE "Order" ADD CONSTRAINT "Order_refunded_cents_check" CHECK ("refundedCents" >= 0);

-- A dispute is recorded all at once or not at all.
ALTER TABLE "Order" ADD CONSTRAINT "Order_dispute_check"
  CHECK (num_nonnulls("stripeDisputeId", "disputeStatus", "disputeReason", "disputedAt") IN (0, 4));
