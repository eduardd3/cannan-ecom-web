// lib/products/variant-fields.ts
//
// Pure parsing for the variant form. No server imports: the form (a client
// component) uses the limits, and the server action uses the parsers.

export const MAX_OPTION_LENGTH = 40;
export const MAX_SKU_LENGTH = 64;
export const MAX_PRICE_CENTS = 99_999_99; // $99,999.99
export const MAX_OPENING_STOCK = 10_000;
export const MAX_POSITION = 999;

/**
 * "24.99", "24.9", "24", "$1,024.50" → cents. Null for anything else,
 * including zero: nothing in the shop is free.
 */
export function parsePriceCents(value: string): number | null {
  const cleaned = value.trim().replace(/^\$/, "").replace(/,/g, "");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_PRICE_CENTS) return null;
  return cents;
}

/** Cents → the price field's text, e.g. 2499 → "24.99". */
export function formatPriceInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Uppercased and trimmed. Letters, digits, and - _ . only; must start with a letter or digit. */
export function normalizeSku(value: string): string | null {
  const sku = value.trim().toUpperCase();
  if (sku.length === 0 || sku.length > MAX_SKU_LENGTH) return null;
  return /^[A-Z0-9][A-Z0-9._-]*$/.test(sku) ? sku : null;
}

export type Parsed<T> = { ok: true; value: T } | { ok: false };

/** Optional: blank is null. Otherwise 10 letters or digits, uppercased. */
export function parseAsin(value: string): Parsed<string | null> {
  const asin = value.trim().toUpperCase();
  if (asin === "") return { ok: true, value: null };
  return /^[A-Z0-9]{10}$/.test(asin) ? { ok: true, value: asin } : { ok: false };
}

export type VariantOption = { name: string; value: string } | null;

/**
 * Both blank is the product's default variant (null). Both filled is a named
 * option like Size: Large. One without the other is an error.
 */
export function parseOption(name: string, value: string): Parsed<VariantOption> | { ok: false; message: string } {
  const n = name.trim().replace(/\s+/g, " ");
  const v = value.trim().replace(/\s+/g, " ");
  if (!n && !v) return { ok: true, value: null };
  if (!n || !v) return { ok: false, message: "Fill in both the option name and value, or leave both blank." };
  if (n.length > MAX_OPTION_LENGTH || v.length > MAX_OPTION_LENGTH) {
    return { ok: false, message: `Keep option names and values to ${MAX_OPTION_LENGTH} characters or fewer.` };
  }
  return { ok: true, value: { name: n, value: v } };
}

/** A whole number from 0 to max. Blank is `blank`. */
export function parseWholeNumber(value: string, max: number, blank: number | null): Parsed<number | null> {
  const trimmed = value.trim();
  if (trimmed === "") return { ok: true, value: blank };
  if (!/^\d+$/.test(trimmed)) return { ok: false };
  const n = Number(trimmed);
  return n <= max ? { ok: true, value: n } : { ok: false };
}

/** How a variant is labeled in admin lists: its option, or "Default". */
export function optionLabel(option: VariantOption): string {
  return option ? `${option.name}: ${option.value}` : "Default";
}
