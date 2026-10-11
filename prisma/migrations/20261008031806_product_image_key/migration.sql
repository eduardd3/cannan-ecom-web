-- Hand-written: ProductImage stores a storage key instead of a full URL
-- (getImageUrl in src/lib/images.ts builds the URL). RENAME rather than
-- Prisma's generated DROP + ADD, so the statement is safe on a non-empty table.
ALTER TABLE "ProductImage" RENAME COLUMN "url" TO "key";
