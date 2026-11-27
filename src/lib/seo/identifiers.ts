// lib/seo/identifiers.ts
//
// The product identifiers Google receives for one variant, shared by the
// Merchant Center feed (lib/feed/items.ts) and the product page's JSON-LD
// (lib/seo/product.ts), so the two can't disagree.

export type ProductIdentifiers = {
  brand: string | null;
  gtin: string | null;
  mpn: string | null;
  /** false → the feed sends identifier_exists = no */
  identifierExists: boolean;
};

/**
 * Returns the product identifiers Google receives for one variant, shared by
 * the Merchant Center feed (lib/feed/items.ts) and the product page's JSON-LD
 * (lib/seo/product.ts), so the two can't disagree.
 * Rules:
 * - brand: the product's brand, or null.
 * - gtin: the variant's gtin only when gtinVerified; otherwise null.
 * - mpn: the variant's mpn, or null. Never the SKU.
 * - identifierExists: false when there is neither a gtin nor an mpn.
 */
export function productIdentifiers(
  product: { brand: string | null },
  variant: { gtin: string | null; gtinVerified: boolean; mpn: string | null },
): ProductIdentifiers {
  const gtin = variant.gtinVerified ? variant.gtin : null;
return { brand: product.brand, gtin, mpn: variant.mpn, identifierExists: gtin !== null || variant.mpn !== null };
}
