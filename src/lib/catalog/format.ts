// lib/catalog/format.ts
//
// How variants read to a shopper. No server imports: used by queries, the
// webhook, and client components alike, so every label changes together.

type OptionValues = { option1Value: string | null; option2Value: string | null };

/**
 * The variant's option values, option 1 first: "Roja · 12 in". Null for a
 * product's single default variant. Names aren't included; the picker shows
 * them, and the values read on their own in a cart or an order.
 */
export function formatVariantLabel(variant: OptionValues): string | null {
  const values = [variant.option1Value, variant.option2Value].filter((value): value is string => Boolean(value));
  return values.length > 0 ? values.join(" · ") : null;
}

// A Prisma Decimal, or the string/number the query layer turned it into.
type Inches = { toString(): string } | string | number | null;

type Dimensions = { heightIn: Inches; widthIn: Inches; depthIn: Inches };

/** "8.00" → "8", "3.50" → "3.5". */
function inches(value: Exclude<Inches, null>): string {
  return String(Number(value.toString()));
}

type DimensionAxis = { key: keyof Dimensions; label: string };

export type DimensionLayout = { abbreviation: string; axes: DimensionAxis[] };

const HEIGHT_WIDTH_DEPTH: DimensionLayout = {
  abbreviation: "H × W × D",
  axes: [
    { key: "heightIn", label: "Height" },
    { key: "widthIn", label: "Width" },
    { key: "depthIn", label: "Depth" },
  ],
};

// Prints read across first. Length is the horizontal side, stored as widthIn.
const LENGTH_HEIGHT_DEPTH: DimensionLayout = {
  abbreviation: "L × H × D",
  axes: [
    { key: "widthIn", label: "Length" },
    { key: "heightIn", label: "Height" },
    { key: "depthIn", label: "Depth" },
  ],
};

/** The order and names a product type's dimensions read in. */
export function dimensionLayout(productTypeSlug: string): DimensionLayout {
  return productTypeSlug === "framed-prints" ? LENGTH_HEIGHT_DEPTH : HEIGHT_WIDTH_DEPTH;
}

/**
 * In the product type's order: "8 × 3.5 × 3 in" (height × width × depth for
 * most types). Null unless all three are set (the database allows all or none).
 */
export function formatDimensions(dimensions: Dimensions, productTypeSlug: string): string | null {
  const values = dimensionLayout(productTypeSlug).axes.map(({ key }) => dimensions[key]);
  if (values.some((value) => value === null)) return null;
  return `${values.map((value) => inches(value!)).join(" × ")} in`;
}
