// lib/feed/items.ts
//
// Step 3. Pure: FeedProductView[] in, FeedItem[] out. No server imports, so
// every rule is a unit test (items.test.ts). This file holds all the
// decisions from the field mapping table in the feed plan.

import { galleryImages, productVariantPath } from "@/lib/catalog/product-detail";
import type { ProductVariantView } from "@/lib/catalog/types";
import { productPath } from "@/lib/products/slug";
import { formatPrice, variantDisplayName, variesByProperty } from "@/lib/seo/product";
import { absoluteUrl } from "@/lib/seo/site";
import { GOOGLE_PRODUCT_CATEGORY } from "./categories";
import type { FeedItem, FeedProductView } from "./types";

/** Matches the return policy you create in Merchant Center for final-sale items. */
export const FINAL_SALE_RETURN_LABEL = "final-sale";

/** Google's limits; longer values are cut, not rejected, so trim them yourself. */
export const MAX_TITLE_LENGTH = 150;
export const MAX_DESCRIPTION_LENGTH = 5000;
export const MAX_ADDITIONAL_IMAGES = 10;

/**
 * One item per active variant, in product order, then variant order.
 * Variants toFeedItem can't list (null) are left out of the file, which
 * removes them from Merchant Center at the next fetch.
 */
export function toFeedItems(products: FeedProductView[]): FeedItem[] {
  return products.flatMap((product) =>
    product.variants.flatMap((variant) => {
      const item = toFeedItem(product, variant);
      return item ? [item] : [];
    }),
  );
}

/**
 * One item from the helpers below. Optional fields are left undefined when
 * they don't apply; the renderer leaves those tags out. itemGroupId only when
 * the product has options (a product without them is a single Product in the
 * JSON-LD too, with no group). Null when the variant can't be listed (no
 * image: see feedImages).
 */
export function toFeedItem(product: FeedProductView, variant: ProductVariantView): FeedItem | null {
  const images = feedImages(product, variant);
  if (!images) return null;

  return {
    id: String(variant.id),
    itemGroupId: product.option1Name !== null ? String(product.id) : undefined,
    title: feedTitle(product, variant),
    description: feedDescription(product.description),
    link: feedLink(product, variant),
    ...images,
    availability: feedAvailability(variant.stock),
    price: feedPrice(variant.priceCents),
    condition: "new",
    ...feedIdentifiers(product, variant),
    ...feedVariantAttributes(product, variant),
    productType: feedProductType(product),
    googleProductCategory: GOOGLE_PRODUCT_CATEGORY[product.productType.slug],
    returnPolicyLabel: product.isFinalSale ? FINAL_SALE_RETURN_LABEL : undefined,
  };
}

/**
 * "San José Statue, 12 in" for a variant, just the name for a product
 * without options, capped at MAX_TITLE_LENGTH. variantDisplayName is shared
 * with the JSON-LD, so the two names Google compares can't drift.
 */
export function feedTitle(product: FeedProductView, variant: ProductVariantView): string {
  const title = product.option1Name === null ? product.name : variantDisplayName(product.name, variant);
  return truncate(title, MAX_TITLE_LENGTH);
}

/**
 * The variant's page URL, absolute: absoluteUrl(productVariantPath(slug, id))
 * when the product has options, absoluteUrl(productPath(slug)) when it
 * doesn't. Both helpers already exist; the JSON-LD uses the same pair.
 */
export function feedLink(product: FeedProductView, variant: ProductVariantView): string {
  return product.option1Name === null
    ? absoluteUrl(productPath(product.slug))
    : absoluteUrl(productVariantPath(product.slug, variant.id));
}

/**
 * The main image and up to MAX_ADDITIONAL_IMAGES more, absolute, in
 * galleryImages order (the variant's own images first, then shared ones).
 * Null when there are none: Google requires image_link, so the variant is
 * left out of the feed rather than sent without one.
 *
 * Later (photo option A): swap in the unwatermarked copy's URL here, and only
 * here, once those copies exist.
 */
export function feedImages(
  product: FeedProductView,
  variant: ProductVariantView,
): { imageLink: string; additionalImageLinks: string[] } | null {
  const images = galleryImages(product.images, variant.id).map((image) => absoluteUrl(image.url));
  const [first, ...rest] = images;
  if (first === undefined) return null;
  return { 
    imageLink: first,
    additionalImageLinks: rest.slice(0,MAX_ADDITIONAL_IMAGES)
  }
}

/** "in_stock" when stock > 0, else "out_of_stock". Same rule as the JSON-LD's offer(). */
export function feedAvailability(stock: number): FeedItem["availability"] {
  return stock > 0 ? "in_stock" : "out_of_stock";
}

/** 3400 → "34.00 USD". Reuse formatPrice from lib/seo/product.ts (integer math). */
export function feedPrice(priceCents: number): string {
  return `${formatPrice(priceCents)} USD`;
}

/**
 * brand, gtin, mpn, identifierExists, following the identifier rules:
 * - gtin set (Bibles: the ISBN) → brand + gtin, no mpn. The SKU isn't the
 *   publisher's part number, so it must not pose as one.
 * - no gtin → brand + mpn (the SKU).
 * - no brand (shouldn't happen; a guard) → none of the three, and
 *   identifierExists "no".
 */
export function feedIdentifiers(
  product: FeedProductView,
  variant: ProductVariantView,
): Pick<FeedItem, "brand" | "gtin" | "mpn" | "identifierExists"> {
  if (product.brand === null) return { identifierExists: "no" };
  return variant.gtin !== null
    ? { brand: product.brand, gtin: variant.gtin }
    : { brand: product.brand, mpn: variant.sku };
}

/**
 * size and/or color, from whichever option is named Size or Color (case-
 * insensitive), the same way the JSON-LD fills variesBy: variesByProperty
 * decides "which option counts as size" for both.
 */
export function feedVariantAttributes(
  product: FeedProductView,
  variant: ProductVariantView,
): Pick<FeedItem, "size" | "color"> {
  const attributes: Pick<FeedItem, "size" | "color"> = {};
  for (const [name, value] of [
    [product.option1Name, variant.option1Value],
    [product.option2Name, variant.option2Value],
  ] as const) { 
    const property = variesByProperty(name);
    if (property !== null && value !== null) attributes[property] = value; 
  }
  return attributes;
}

/**
 * Your own category path: "Framed prints > Virgen de Guadalupe", or just
 * "Bibles" when there's no category. Free text; Google uses it for your
 * reporting, not for matching.
 */
export function feedProductType(product: FeedProductView): string {
  const { productType, category } = product;
  return category === null ? productType.name : `${productType.name} > ${category.name}`;
}

/**
 * Plain text, at most MAX_DESCRIPTION_LENGTH characters. Descriptions are
 * stored as plain text today; if that ever changes (markdown, HTML), strip it
 * here.
 */
export function feedDescription(description: string): string {
  return truncate(description.trim(), MAX_DESCRIPTION_LENGTH);
}

/**
 * At most max UTF-16 units, cut at the last whitespace when the cut has one,
 * so a word isn't split. Never ends on half an emoji. Counting units rather
 * than characters can only come out shorter, so Google's limit always holds.
 */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  let cut = text.slice(0, max);
  // A high surrogate at the end is the first half of an emoji cut in two.
  if (/[\uD800-\uDBFF]$/.test(cut)) cut = cut.slice(0, -1);
  // The cut already ends a word when the text goes on with whitespace.
  if (/\s/.test(text[cut.length])) return cut.trimEnd();
  // Only a space past the start counts, or a long first word would leave "".
  const lastSpace = cut.search(/\s\S*$/);
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd();
}
