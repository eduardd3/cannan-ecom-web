-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "reviewResolvedAt" TIMESTAMP(3),
ADD COLUMN     "reviewResolvedById" INTEGER;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_reviewResolvedById_fkey" FOREIGN KEY ("reviewResolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Hand-written: CHECK constraints Prisma's schema language can't express.

-- An order still in review can't be resolved, and only an order that was
-- reviewed (has a reviewReason) can carry a resolution.
ALTER TABLE "Order" ADD CONSTRAINT "Order_review_resolved_check"
  CHECK (
    ("status" <> 'NEEDS_REVIEW' OR "reviewResolvedAt" IS NULL)
    AND ("reviewResolvedAt" IS NULL OR "reviewReason" IS NOT NULL)
  );
