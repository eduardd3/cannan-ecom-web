// lib/products/gtin.ts
//
// Pure GTIN rules. No server imports: the variant form (a client component)
// and the server action both use them.

/**
 * A GTIN-8, UPC (12), EAN (13), or GTIN-14, digits only, with a correct GS1
 * check digit. Callers strip spaces and hyphens first (parseGtin does).
 */
export function isValidGtin(digits: string): boolean {
  if (!/^(\d{8}|\d{12,14})$/.test(digits)) return false;
  // GS1: from the right, excluding the check digit, weights alternate 3, 1.
  const values = [...digits].map(Number);
  const check = values.pop()!;
  const sum = values.reverse().reduce((total, digit, i) => total + digit * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

// Google won't accept these as a product's GTIN. Prefixes are on the 13-digit
// form (see thirteenDigitForm):
// - 2, 02, 04: restricted ranges
//   https://support.google.com/merchants/answer/6324461 ("Minimum requirements")
//   https://support.google.com/merchants/answer/12469034
// - 05, 98, 99: coupons
//   https://support.google.com/merchants/answer/6324461 ("Minimum requirements")
const RESTRICTED_PREFIXES = ["2", "02", "04", "05", "98", "99"];

/**
 * The GTIN as 13 digits: a UPC-12 gets one leading 0; a GTIN-14 drops its
 * packaging indicator (the first digit). Null for GTIN-8, which has its own
 * prefix scheme and isn't checked.
 */
function thirteenDigitForm(digits: string): string | null {
  if (digits.length === 12) return `0${digits}`;
  if (digits.length === 13) return digits;
  if (digits.length === 14) return digits.slice(1);
  return null;
}

/**
 * True when Google won't accept the number as a product GTIN, even with a
 * valid check digit: a GTIN-14 for bulk sale (first digit 9, per
 * https://support.google.com/merchants/answer/6286298), or a restricted or
 * coupon prefix. GTIN-8s are never restricted here. Expects digits that
 * passed isValidGtin.
 */
export function isRestrictedGtin(digits: string): boolean {
  if (digits.length === 14 && digits.startsWith("9")) return true;
  const thirteen = thirteenDigitForm(digits);
  return thirteen !== null && RESTRICTED_PREFIXES.some((prefix) => thirteen.startsWith(prefix));
}
