-- Hand-written fix: the catalog_model CHECK let a partial set through. With
-- one dimension null, "x > 0" is NULL rather than false, and a CHECK only
-- rejects false. Spell out NOT NULL so all three are set (each > 0) or none.
ALTER TABLE "ProductVariant" DROP CONSTRAINT "ProductVariant_dimensions_check";

ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_dimensions_check" CHECK (
    ("heightIn" IS NULL AND "widthIn" IS NULL AND "depthIn" IS NULL)
    OR ("heightIn" IS NOT NULL AND "widthIn" IS NOT NULL AND "depthIn" IS NOT NULL
        AND "heightIn" > 0 AND "widthIn" > 0 AND "depthIn" > 0)
);
