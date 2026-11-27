-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "gtinVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mpn" TEXT;

-- Hand-written: nothing in the shop is a Cannan-branded product; the brand
-- was the admin form's default. Null = left out of the feed and JSON-LD.
UPDATE "Product" SET "brand" = NULL WHERE "brand" = 'Cannan';

-- Hand-written: the same shapes parseGtin accepts (GTIN-8, UPC-12, EAN-13, GTIN-14).
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_gtin_format_check"
  CHECK ("gtin" IS NULL OR "gtin" ~ '^([0-9]{8}|[0-9]{12,14})$');

-- Hand-written: only a GTIN that exists can be verified.
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_gtinVerified_check"
  CHECK (NOT "gtinVerified" OR "gtin" IS NOT NULL);

-- Hand-written: a verified GTIN identifies one variant. Padded to 14 digits so
-- a UPC-12 and its EAN-13 form (leading 0) count as the same number.
-- Unverified GTINs may repeat (suppliers reuse them across colors).
CREATE UNIQUE INDEX "ProductVariant_verified_gtin_key"
  ON "ProductVariant" (lpad("gtin", 14, '0')) WHERE "gtinVerified";
