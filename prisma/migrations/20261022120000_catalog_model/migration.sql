-- Catalog model: product types, a per-collection facet, two variant options
-- with names on the product, and Details fields (material, dimensions, final
-- sale). Existing rows are backfilled in place; order rows are not touched
-- (OrderItem.variantLabel is a snapshot and keeps its old "Size: 8 Inch" text).
--
-- Each guard below aborts the whole migration rather than guess.

-- ---------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------

-- A product's variants must share one option name before it moves to the product.
DO $$
DECLARE bad TEXT;
BEGIN
    SELECT string_agg(DISTINCT "productId"::TEXT, ', ') INTO bad
    FROM (
        SELECT "productId" FROM "ProductVariant"
        GROUP BY "productId"
        HAVING COUNT(DISTINCT COALESCE("name", '')) > 1
    ) mixed;
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'Products with mixed variant option names: %', bad;
    END IF;
END $$;

-- A product moves from many categories to at most one.
DO $$
DECLARE bad TEXT;
BEGIN
    SELECT string_agg("productId"::TEXT, ', ') INTO bad
    FROM (SELECT "productId" FROM "ProductCategory" GROUP BY "productId" HAVING COUNT(*) > 1) multi;
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'Products with more than one category: %', bad;
    END IF;
END $$;

-- A category moves to one collection: the one its products are in.
DO $$
DECLARE bad TEXT;
BEGIN
    SELECT string_agg("categoryId"::TEXT, ', ') INTO bad
    FROM (
        SELECT pc."categoryId" FROM "ProductCategory" pc
        JOIN "Product" p ON p."id" = pc."productId"
        GROUP BY pc."categoryId"
        HAVING COUNT(DISTINCT p."collectionId") > 1
    ) spread;
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'Categories used in more than one collection: %', bad;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Collections: the facet, and the slug the switcher links by
-- ---------------------------------------------------------------------------

CREATE TYPE "FacetSource" AS ENUM ('CATEGORY', 'VARIANT_OPTION');

ALTER TABLE "Collection" ADD COLUMN "facetLabel" TEXT,
ADD COLUMN "facetSource" "FacetSource" NOT NULL DEFAULT 'CATEGORY';

UPDATE "Collection" SET "facetLabel" = 'Devotion', "updatedAt" = CURRENT_TIMESTAMP WHERE "slug" = 'signature';
UPDATE "Collection" SET "facetLabel" = 'Orisha', "updatedAt" = CURRENT_TIMESTAMP WHERE "slug" = 'orisha';
UPDATE "Collection" SET "facetLabel" = 'Color', "facetSource" = 'VARIANT_OPTION', "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'santa-muerte';

-- Matches the collection's name (Orishas). Only the original slug is changed;
-- nothing links to collections by slug yet.
UPDATE "Collection" SET "slug" = 'orishas', "updatedAt" = CURRENT_TIMESTAMP WHERE "slug" = 'orisha';

-- ---------------------------------------------------------------------------
-- Product types: rows inserted here so production gets them too
-- ---------------------------------------------------------------------------

CREATE TABLE "ProductType" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductType_slug_key" ON "ProductType"("slug");

INSERT INTO "ProductType" ("slug", "name", "position", "updatedAt") VALUES
    ('statues', 'Statues', 0, CURRENT_TIMESTAMP),
    ('nativity-sets', 'Nativity sets', 1, CURRENT_TIMESTAMP),
    ('crucifixes', 'Crucifixes', 2, CURRENT_TIMESTAMP),
    ('framed-prints', 'Framed prints', 3, CURRENT_TIMESTAMP),
    ('candles', 'Candles', 4, CURRENT_TIMESTAMP),
    ('bibles', 'Bibles', 5, CURRENT_TIMESTAMP);

-- Add nullable, backfill from the product's name, then require. Anything the
-- name doesn't place becomes a statue (most of the catalog); fix in the admin.
ALTER TABLE "Product" ADD COLUMN "productTypeId" INTEGER;

UPDATE "Product" p SET "productTypeId" = t."id"
FROM "ProductType" t
WHERE t."slug" = CASE
    WHEN p."name" ~* '(nativity|nacimiento)' THEN 'nativity-sets'
    WHEN p."name" ~* 'crucifi' THEN 'crucifixes'
    WHEN p."name" ~* '(framed|print)' THEN 'framed-prints'
    WHEN p."name" ~* '(candle|vela)' THEN 'candles'
    WHEN p."name" ~* '(bible|biblia)' THEN 'bibles'
    ELSE 'statues'
END;

ALTER TABLE "Product" ALTER COLUMN "productTypeId" SET NOT NULL;

CREATE INDEX "Product_productTypeId_idx" ON "Product"("productTypeId");

ALTER TABLE "Product" ADD CONSTRAINT "Product_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Categories: one collection each; one optional category per product
-- ---------------------------------------------------------------------------

-- A category's collection is its products' (one, per the guard above); an
-- unused category goes to the default collection.
ALTER TABLE "Category" ADD COLUMN "collectionId" INTEGER;

UPDATE "Category" c SET "collectionId" = COALESCE(
    (SELECT p."collectionId" FROM "ProductCategory" pc JOIN "Product" p ON p."id" = pc."productId"
     WHERE pc."categoryId" = c."id" LIMIT 1),
    (SELECT "id" FROM "Collection" WHERE "isDefault")
);

ALTER TABLE "Category" ALTER COLUMN "collectionId" SET NOT NULL;

CREATE INDEX "Category_collectionId_idx" ON "Category"("collectionId");

ALTER TABLE "Category" ADD CONSTRAINT "Category_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product" ADD COLUMN "categoryId" INTEGER;

UPDATE "Product" p SET "categoryId" = pc."categoryId"
FROM "ProductCategory" pc
WHERE pc."productId" = p."id";

CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductCategory" DROP CONSTRAINT "ProductCategory_productId_fkey";
ALTER TABLE "ProductCategory" DROP CONSTRAINT "ProductCategory_categoryId_fkey";
DROP TABLE "ProductCategory";

-- ---------------------------------------------------------------------------
-- Variant options: names on the product, values on the variant
-- ---------------------------------------------------------------------------

-- 1. New columns.
ALTER TABLE "Product" ADD COLUMN "option1Name" TEXT,
ADD COLUMN "option2Name" TEXT;

ALTER TABLE "ProductVariant" ADD COLUMN "option1Value" TEXT,
ADD COLUMN "option2Value" TEXT;

-- 2. Copy. One name per product (guard above); a null name stays null.
UPDATE "Product" p SET "option1Name" = v."name"
FROM (SELECT DISTINCT "productId", "name" FROM "ProductVariant" WHERE "name" IS NOT NULL) v
WHERE v."productId" = p."id";

UPDATE "ProductVariant" SET "option1Value" = "value";

-- 3. Drop the old columns and their index.
DROP INDEX "ProductVariant_productId_name_value_key";

ALTER TABLE "ProductVariant" DROP COLUMN "name",
DROP COLUMN "value";

-- Hand-written: NULLS NOT DISTINCT (Postgres 15+), which Prisma can't express,
-- so a product can't have two default (null, null) variants.
CREATE UNIQUE INDEX "ProductVariant_productId_option1Value_option2Value_key" ON "ProductVariant"("productId", "option1Value", "option2Value") NULLS NOT DISTINCT;

-- Hand-written: option 2 only alongside option 1.
ALTER TABLE "Product" ADD CONSTRAINT "Product_option_names_check"
    CHECK ("option2Name" IS NULL OR "option1Name" IS NOT NULL);

ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_option_values_check"
    CHECK ("option2Value" IS NULL OR "option1Value" IS NOT NULL);

-- ---------------------------------------------------------------------------
-- Details
-- ---------------------------------------------------------------------------

ALTER TABLE "Product" ADD COLUMN "material" TEXT,
ADD COLUMN "isFinalSale" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ProductVariant" ADD COLUMN "heightIn" DECIMAL(6,2),
ADD COLUMN "widthIn" DECIMAL(6,2),
ADD COLUMN "depthIn" DECIMAL(6,2);

-- Hand-written: dimensions are all set (each > 0) or all null.
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_dimensions_check" CHECK (
    ("heightIn" IS NULL AND "widthIn" IS NULL AND "depthIn" IS NULL)
    OR ("heightIn" > 0 AND "widthIn" > 0 AND "depthIn" > 0)
);
