// lib/feed/types.ts
//
// Types only. The contract between the three steps of the Merchant Center
// feed: the query returns FeedProductView[], toFeedItems turns them into
// FeedItem[], and renderFeedXml writes those out. Each step can be tested on
// its own because they only share these shapes.

import type { ProductDetailView } from "@/lib/catalog/types";

/**
 * One visible product as the feed reads it: the detail page's view without
 * the collection (the feed has no breadcrumb or filters). Reusing the detail
 * view lets the feed call the same helpers as the page's JSON-LD
 * (galleryImages, formatVariantLabel, formatPrice), so the two can't drift.
 * Google compares the feed to the landing page; a mismatch disapproves items.
 */
export type FeedProductView = Omit<ProductDetailView, "collection">;

/**
 * One Merchant Center item: one per ACTIVE variant. Field names are
 * camelCase here; renderFeedXml maps each to its g: tag (itemGroupId →
 * g:item_group_id). An undefined field means "leave the tag out", which is
 * what Google's spec asks for when an attribute has no value.
 */
export type FeedItem = {
  id: string; // the variant's database id; never changes, even across renames
  itemGroupId?: string; // the product's id; only when the product has options
  title: string; // max 150 characters
  description: string; // plain text, max 5,000 characters
  link: string; // absolute, with ?variant= when the product has options
  imageLink: string; // absolute; the unwatermarked copy once photos are watermarked
  additionalImageLinks: string[]; // up to 10; one tag per entry
  availability: "in_stock" | "out_of_stock";
  price: string; // "34.00 USD"
  condition: "new";
  brand?: string;
  gtin?: string; // Bibles: the ISBN
  mpn?: string; // the SKU, only when there's no gtin
  identifierExists?: "no"; // only when there's no brand at all (a guard)
  size?: string;
  color?: string;
  productType: string; // "Framed prints > Virgen de Guadalupe"
  googleProductCategory?: string; // numeric id as a string, from categories.ts
  returnPolicyLabel?: string; // "final-sale" on final-sale products
};
