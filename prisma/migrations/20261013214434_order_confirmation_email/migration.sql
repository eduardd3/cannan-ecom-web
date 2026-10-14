-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "confirmationEmailSentAt" TIMESTAMP(3);

-- Hand-written: CHECK constraints Prisma's schema language can't express.

-- The confirmation waits for review: an order in NEEDS_REVIEW can't have one.
ALTER TABLE "Order" ADD CONSTRAINT "Order_confirmation_email_check"
  CHECK ("confirmationEmailSentAt" IS NULL OR "status" <> 'NEEDS_REVIEW');
