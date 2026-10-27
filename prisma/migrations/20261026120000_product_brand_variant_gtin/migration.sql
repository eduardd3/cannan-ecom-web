-- Nullable, no backfill: production gets the columns with no data changes.

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "brand" TEXT;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "gtin" TEXT;
