// lib/catalog/sorting.ts
//
// The collection page's sort and page parameters, and the card order. Kept
// apart from listing.ts so listing.test.ts can stand these in while they're
// being written: a module can't mock functions it calls on itself.

import type { ListingCard, SearchParam } from "./listing";

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc";

/** The sort links, in the order the page shows them. */
export const SORT_OPTIONS: readonly { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "newest", label: "Newest" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
];

/**
 * L1 · ?sort= as a SortKey.
 *
 * - "newest", "price-asc" or "price-desc" → that key.
 * - Anything else, missing, or an array whose first value isn't one of those
 *   → "featured". An array uses its first value, like ?type= and ?facet=.
 */
export function parseSort(param: SearchParam): SortKey {
  throw new Error("TODO(Lalo): L1 parseSort");
}

/**
 * L2 · ?page= as a page number.
 *
 * - A whole number ≥ 1 → that number.
 * - "abc", "0", "-2", "2.5", "", or missing → 1. An array uses its first value.
 * - High values are NOT capped here: that needs the total, so page.tsx
 *   redirects a page past the end instead (L5).
 */
export function parsePage(param: SearchParam): number {
  throw new Error("TODO(Lalo): L2 parsePage");
}

/**
 * L3 · The comparator buildListing sorts the filtered cards with.
 *
 * 1. In stock before sold out, under EVERY sort.
 * 2. Then by sort:
 *    - featured:   featured true first, then rank;
 *    - newest:     rank;
 *    - price-asc:  minPriceCents ascending, then rank;
 *    - price-desc: minPriceCents descending, then rank.
 * 3. rank is always the final tiebreak, so the order is the same on every
 *    request: without it, equal prices could swap places and a piece could
 *    show on two pages.
 *
 * minPriceCents is already the matching variants' price (a Roja filter
 * prices the card from its red variants), so nothing here reads variants.
 */
export function compareCards(sort: SortKey): (a: ListingCard, b: ListingCard) => number {
  throw new Error("TODO(Lalo): L3 compareCards");
}
