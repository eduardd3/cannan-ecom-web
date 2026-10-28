// lib/catalog/product-detail.ts
//
// The product page's rules: breadcrumb, which variant is selected, the option
// buttons, the gallery, quantity, and the add-to-cart message. Pure, with no
// server imports, so the server render and the client component use the same
// functions and they're unit-tested without React.

import { MAX_QTY_PER_LINE } from "@/lib/cart/schemas";
import type { ActionResult } from "@/lib/cart/types";
import { productPath } from "@/lib/products/slug";
import { collectionHref } from "./listing";
import type { ProductDetailView, ProductImageView, ProductVariantView } from "./types";

/** /products/{slug}, with ?variant= when one is given. */
export function productVariantPath(slug: string, variantId: number | null): string {
  return variantId === null ? productPath(slug) : `${productPath(slug)}?variant=${variantId}`;
}

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

export type BreadcrumbPart = { name: string; href: string };

type BreadcrumbProduct = Pick<ProductDetailView, "collection" | "category" | "productType">;

/**
 * The collection, then at most one filter of its page: the category when the
 * collection filters by category, otherwise the type when the Type filter
 * shows. The second part only ever links to a filter the page really has:
 * "Signature / San José", "Signature / Candles", just "Santa Muerte".
 */
export function breadcrumbParts({ collection, category, productType }: BreadcrumbProduct): BreadcrumbPart[] {
  const parts = [{ name: collection.name, href: collectionHref(collection.slug, { type: null, facet: null }) }];
  if (category && collection.facetSource === "CATEGORY" && collection.facetLabel !== null) {
    parts.push({ name: category.name, href: collectionHref(collection.slug, { type: null, facet: category.slug }) });
  } else if (collection.typeFilterVisible) {
    parts.push({ name: productType.name, href: collectionHref(collection.slug, { type: productType.slug, facet: null }) });
  }
  return parts;
}

// ---------------------------------------------------------------------------
// Variant selection
// ---------------------------------------------------------------------------

/**
 * The variant the page opens on: the one ?variant= names, when it's one of
 * this product's active variants; otherwise the first with stock, otherwise
 * the first. variants is never empty (a visible product has an active one).
 */
export function initialVariant(
  variants: ProductVariantView[],
  param: string | string[] | undefined,
): ProductVariantView {
  const raw = Array.isArray(param) ? param[0] : param;
  return (
    variants.find((variant) => String(variant.id) === raw) ??
    variants.find((variant) => variant.stock > 0) ??
    variants[0]
  );
}

export type OptionValue = { value: string; selected: boolean; soldOut: boolean };

export type OptionGroup = { option: 1 | 2; name: string; values: OptionValue[] };

function distinct(values: (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => value !== null))];
}

/**
 * The option buttons for the selected variant, in variant order. Option 1
 * lists every value, sold out when none of its variants has stock. Option 2
 * lists only the values that exist with the selected option 1 value; the
 * rest are left out, not struck through. A default variant has no groups.
 */
export function optionGroups(
  product: Pick<ProductDetailView, "option1Name" | "option2Name" | "variants">,
  selected: ProductVariantView,
): OptionGroup[] {
  const { option1Name, option2Name, variants } = product;
  if (option1Name === null) return [];

  const groups: OptionGroup[] = [
    {
      option: 1,
      name: option1Name,
      values: distinct(variants.map((variant) => variant.option1Value)).map((value) => ({
        value,
        selected: value === selected.option1Value,
        soldOut: variants.every((variant) => variant.option1Value !== value || variant.stock <= 0),
      })),
    },
  ];

  if (option2Name !== null) {
    const siblings = variants.filter((variant) => variant.option1Value === selected.option1Value);
    groups.push({
      option: 2,
      name: option2Name,
      values: distinct(siblings.map((variant) => variant.option2Value)).map((value) => ({
        value,
        selected: value === selected.option2Value,
        soldOut: siblings.every((variant) => variant.option2Value !== value || variant.stock <= 0),
      })),
    });
  }
  return groups;
}

/**
 * The variant after a click on an option button. Option 1 keeps the current
 * option 2 value when that combination exists, otherwise takes the first
 * option 2 value for the new option 1, preferring one in stock. Option 2
 * keeps option 1. An unknown value leaves the selection as it is.
 */
export function selectOption(
  variants: ProductVariantView[],
  current: ProductVariantView,
  option: 1 | 2,
  value: string,
): ProductVariantView {
  if (option === 2) {
    return (
      variants.find((variant) => variant.option1Value === current.option1Value && variant.option2Value === value) ??
      current
    );
  }
  const candidates = variants.filter((variant) => variant.option1Value === value);
  return (
    candidates.find((variant) => variant.option2Value === current.option2Value) ??
    candidates.find((variant) => variant.stock > 0) ??
    candidates[0] ??
    current
  );
}

// ---------------------------------------------------------------------------
// Gallery and quantity
// ---------------------------------------------------------------------------

/** The variant's own images first, then the shared ones; other variants' are left out. */
export function galleryImages(images: ProductImageView[], variantId: number): ProductImageView[] {
  return [
    ...images.filter((image) => image.variantId === variantId),
    ...images.filter((image) => image.variantId === null),
  ];
}

/** The most one line can hold of a variant: its stock, up to the per-line limit. */
function maxQuantity(stock: number): number {
  return Math.min(stock, MAX_QTY_PER_LINE);
}

/** The Quantity select's choices: 1 to min(stock, MAX_QTY_PER_LINE). Empty when sold out. */
export function quantityOptions(stock: number): number[] {
  return Array.from({ length: Math.max(0, maxQuantity(stock)) }, (_, i) => i + 1);
}

/** The quantity kept when the variant changes: within 1..max for its stock. */
export function clampQuantity(quantity: number, stock: number): number {
  return Math.max(1, Math.min(quantity, maxQuantity(stock)));
}

// ---------------------------------------------------------------------------
// Add-to-cart message
// ---------------------------------------------------------------------------

export type CartMessage = {
  text: string;
  tone: "notice" | "error";
  viewCart: boolean; // show the "View cart" link
};

/**
 * addToCart capped the line. n is the line's new total, which is either the
 * variant's stock or the per-line limit, so the copy states the total, not
 * how many were just added (it may already have been in the cart).
 */
export function reducedQuantityMessage(n: number): string {
  return n === 1
    ? "Your cart now has 1 of this piece, the most you can add."
    : `Your cart now has ${n} of these, the most you can add.`;
}

const TRY_AGAIN = "We couldn't add this to your cart. Please try again.";

/**
 * What the page says after an add. result is null when the action call
 * itself failed (network, server crash). The action's own messages stay
 * as they are for the cart page; this page words them for a shopper.
 */
export function addToCartMessage(result: ActionResult<{ quantity: number }> | null): CartMessage {
  if (result === null) return { text: TRY_AGAIN, tone: "error", viewCart: false };
  if (result.ok) {
    // addToCart sets a notice only when it capped the quantity.
    return result.notice === undefined
      ? { text: "Added to your cart.", tone: "notice", viewCart: true }
      : { text: reducedQuantityMessage(result.data.quantity), tone: "notice", viewCart: true };
  }
  switch (result.error) {
    case "OUT_OF_STOCK":
      return { text: "This piece just sold out.", tone: "error", viewCart: false };
    case "VARIANT_NOT_FOUND":
      return { text: "This piece is no longer available.", tone: "error", viewCart: false };
    // Guests can no longer hit this on add; kept for any caller that can.
    case "UNAUTHENTICATED":
      return { text: "Your session ended. Sign in again to add this to your cart.", tone: "error", viewCart: false };
    case "RATE_LIMITED":
      return { text: "Too many attempts. Please wait a few minutes and try again.", tone: "error", viewCart: false };
    default:
      return { text: TRY_AGAIN, tone: "error", viewCart: false };
  }
}
