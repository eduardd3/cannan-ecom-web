// lib/seo/product.ts
//
// Structured data for the product page, in Google's merchant-listing shape.
// Pure, with no server imports, so it's unit-tested without the database.
//
// No AggregateOffer anywhere: merchant listings need an exact price per Offer,
// and Google says not to use it for variants. A product with options is a
// ProductGroup with one Product and one Offer per active variant (Google's
// single-page variant pattern: ?variant= preselects one, the canonical has no
// parameters). The markup is the same on every ?variant= URL; only the
// visible selection changes.

import type { BreadcrumbList, MerchantReturnPolicy, Offer, Product, ProductGroup, WithContext } from "schema-dts";

import type { BreadcrumbPart } from "@/lib/catalog/product-detail";
import { galleryImages, productVariantPath } from "@/lib/catalog/product-detail";
import { formatVariantLabel } from "@/lib/catalog/format";
import type { ProductDetailView, ProductVariantView } from "@/lib/catalog/types";
import { productPath } from "@/lib/products/slug";
import { SHIP_TO_COUNTRIES } from "./policies";
import { absoluteUrl } from "./site";

/** 2400 → "24.00". Integer math, so no float rounding; never includes tax. */
export function formatPrice(cents: number): string {
  return `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

// Option names Google can vary a group by. Anything else is left out of
// variesBy and off the variants.
const VARIES_BY = {
  color: "https://schema.org/color",
  size: "https://schema.org/size",
} as const;

type VariesByProperty = keyof typeof VARIES_BY;

function variesByProperty(optionName: string | null): VariesByProperty | null {
  const key = optionName?.trim().toLowerCase();
  return key === "color" || key === "size" ? key : null;
}

// Overrides the Organization's 30-day window (product-level markup wins).
// Damaged final-sale items are still covered; the schema has no way to say so.
const FINAL_SALE_POLICY: MerchantReturnPolicy = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: [...SHIP_TO_COUNTRIES],
  returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
};

function variantImages(product: ProductDetailView, variantId: number): string[] {
  return galleryImages(product.images, variantId).map((image) => absoluteUrl(image.url));
}

function offer(product: ProductDetailView, variant: ProductVariantView, url: string): Offer {
  return {
    "@type": "Offer",
    url,
    price: formatPrice(variant.priceCents),
    priceCurrency: "USD",
    availability: variant.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    ...(product.isFinalSale && { hasMerchantReturnPolicy: FINAL_SALE_POLICY }),
  };
}

function shared(product: ProductDetailView) {
  return {
    name: product.name,
    description: product.description,
    url: absoluteUrl(productPath(product.slug)),
    ...(product.brand !== null && { brand: { "@type": "Brand" as const, name: product.brand } }),
    ...(product.material !== null && { material: product.material }),
  };
}

/**
 * A plain Product with one Offer for a product without options, otherwise a
 * ProductGroup. variants must be the page's list: active only, in order.
 */
export function buildProductJsonLd(product: ProductDetailView): WithContext<Product> | WithContext<ProductGroup> {
  const canonical = absoluteUrl(productPath(product.slug));

  if (product.option1Name === null) {
    const [variant] = product.variants;
    const image = variantImages(product, variant.id);
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      ...shared(product),
      ...(image.length > 0 && { image }),
      sku: variant.sku,
      ...(variant.gtin !== null && { gtin: variant.gtin }),
      offers: offer(product, variant, canonical),
    };
  }

  const options = [
    { property: variesByProperty(product.option1Name), value: (v: ProductVariantView) => v.option1Value },
    { property: variesByProperty(product.option2Name), value: (v: ProductVariantView) => v.option2Value },
  ].filter((option): option is typeof option & { property: VariesByProperty } => option.property !== null);

  // Shared images, or the first variant's when every image belongs to one.
  const sharedImages = product.images.filter((image) => image.variantId === null).map((image) => absoluteUrl(image.url));
  const image = sharedImages.length > 0 ? sharedImages : variantImages(product, product.variants[0].id);

  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    ...shared(product),
    ...(image.length > 0 && { image }),
    productGroupID: String(product.id),
    variesBy: options.map(({ property }) => VARIES_BY[property]),
    hasVariant: product.variants.map((variant): Product => {
      const variantImage = variantImages(product, variant.id);
      return {
        "@type": "Product",
        name: `${product.name}, ${formatVariantLabel(variant)}`,
        sku: variant.sku,
        ...(variant.gtin !== null && { gtin: variant.gtin }),
        ...(variantImage.length > 0 && { image: variantImage }),
        ...Object.fromEntries(options.map(({ property, value }) => [property, value(variant)])),
        offers: offer(product, variant, absoluteUrl(productVariantPath(product.slug, variant.id))),
      };
    }),
  };
}

/**
 * The visible breadcrumb, then the product itself with no URL (Google allows
 * that for the current page). Built from the parts the page renders, so the
 * two can't disagree, and always at least two items, as Google requires.
 */
export function buildBreadcrumbJsonLd(parts: BreadcrumbPart[], productName: string): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      ...parts.map(({ name, href }, index) => ({
        "@type": "ListItem" as const,
        position: index + 1,
        name,
        item: absoluteUrl(href),
      })),
      { "@type": "ListItem", position: parts.length + 1, name: productName },
    ],
  };
}
