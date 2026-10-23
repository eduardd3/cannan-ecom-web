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

/**
 * Height × width × depth: "8 × 3.5 × 3 in". Null unless all three are set
 * (the database allows all or none).
 */
export function formatDimensions({ heightIn, widthIn, depthIn }: Dimensions): string | null {
  if (heightIn === null || widthIn === null || depthIn === null) return null;
  return `${inches(heightIn)} × ${inches(widthIn)} × ${inches(depthIn)} in`;
}
