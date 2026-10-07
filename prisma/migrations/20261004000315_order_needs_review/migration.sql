-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'NEEDS_REVIEW';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "reviewReason" TEXT;

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- Hand-written: CHECK constraints Prisma's schema language can't express.

-- An order in review must say why. ::text because Postgres won't let a
-- transaction use an enum value it just added.
ALTER TABLE "Order" ADD CONSTRAINT "Order_review_reason_check"
  CHECK ("status"::text <> 'NEEDS_REVIEW' OR "reviewReason" IS NOT NULL);
