-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProductSlugRedirect" (
    "slug" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSlugRedirect_pkey" PRIMARY KEY ("slug")
);

-- CreateIndex
CREATE INDEX "ProductSlugRedirect_productId_idx" ON "ProductSlugRedirect"("productId");

-- AddForeignKey
ALTER TABLE "ProductSlugRedirect" ADD CONSTRAINT "ProductSlugRedirect_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written: backfill and CHECK constraints Prisma's schema language can't express.

-- Products already live (or archived, so possibly live before) count as
-- published. Their exact publish date isn't recorded; createdAt is the
-- closest known value.
UPDATE "Product" SET "publishedAt" = "createdAt" WHERE "status" IN ('ACTIVE', 'ARCHIVED');

ALTER TABLE "Product" ADD CONSTRAINT "Product_published_check"
  CHECK ("status" <> 'ACTIVE' OR "publishedAt" IS NOT NULL);

-- Same format lib/products/slug.ts enforces on Product.slug.
ALTER TABLE "ProductSlugRedirect" ADD CONSTRAINT "ProductSlugRedirect_slug_check"
  CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length("slug") <= 80);
