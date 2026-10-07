-- CreateTable
CREATE TABLE "Collection" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "productId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId","categoryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "ProductCategory_categoryId_idx" ON "ProductCategory"("categoryId");

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written: at most one default collection.
CREATE UNIQUE INDEX "Collection_one_default_key" ON "Collection"("isDefault") WHERE "isDefault";

-- Hand-written: the three product lines. Inserted here (not in the seed) so
-- production gets them with `migrate deploy`. Names/descriptions are editable later.
INSERT INTO "Collection" ("slug", "name", "description", "isDefault", "position", "updatedAt") VALUES
    ('signature', 'Signature', 'Our signature handmade collection.', true, 0, CURRENT_TIMESTAMP),
    ('orisha', 'Orisha', 'Handmade goods honoring the Orisha.', false, 1, CURRENT_TIMESTAMP),
    ('santa-muerte', 'Santa Muerte', 'Handmade goods devoted to Santa Muerte.', false, 2, CURRENT_TIMESTAMP);

-- Hand-written: add Product.collectionId nullable, backfill existing products
-- into the default collection, then require it.
ALTER TABLE "Product" ADD COLUMN "collectionId" INTEGER;

UPDATE "Product" SET "collectionId" = (SELECT "id" FROM "Collection" WHERE "isDefault");

ALTER TABLE "Product" ALTER COLUMN "collectionId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Product_collectionId_status_idx" ON "Product"("collectionId", "status");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
