// lib/catalog/cache.ts
//
// The storefront's cross-request catalog cache: getCollectionListing and
// listSwitcherCollections (queries.ts) are stored under CATALOG_TAG for up to
// 15 minutes. Anything that changes what they show must expire the tag right
// away: product, variant, image and category edits, and every stock change
// (manual adjustments, order review and restock, and the Stripe webhook's
// order creation).
//
// One tag for all collections, on purpose: a per-collection tag would need a
// variant → product → collection lookup on every stock change, and one tag
// refreshes three collections at most.
//
// Collections have no admin actions yet. Any future action that changes a
// collection's name, order, facet label, or membership must call
// invalidateCatalog().
import "server-only";

import { revalidateTag, updateTag } from "next/cache";

export const CATALOG_TAG = "catalog";

/**
 * From a Server Action. updateTag expires the tag immediately: the next
 * request waits for fresh data instead of being served the stale copy, so an
 * admin sees their own edit on the next load.
 */
export function invalidateCatalog(): void {
  updateTag(CATALOG_TAG);
}

/**
 * From a Route Handler (the Stripe webhook), where updateTag throws: it only
 * works inside Server Actions. revalidateTag with { expire: 0 } never serves
 * the stale copy, so the next request is a blocking cache miss, the same
 * immediate expiry.
 */
export function invalidateCatalogFromRoute(): void {
  revalidateTag(CATALOG_TAG, { expire: 0 });
}
