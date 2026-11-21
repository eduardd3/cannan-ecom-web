// lib/catalog/listing.ts
//
// The collection page's filters, sort, page and cards, computed from one fetch
// of the collection's visible products (queries.getCollectionListing). Pure,
// with no server imports, so the dependent filters, the per-filter prices, the
// order and the page slice come from the same data and are unit-tested
// together.
//
// In code rather than SQL: a collection is a few hundred pieces at most, and
// the fetch is cached across requests. Adding site search is the point to
// move filtering, sorting and paging into SQL.

import { slugify } from "@/lib/products/slug";
import { compareCards, parsePage, parseSort, type SortKey } from "./sorting";
import type { ProductCardView } from "./types";

/** Pieces per page. */
export const PAGE_SIZE = 24;

export type ListingCollection = {
  slug: string;
  name: string;
  description: string; // the meta description; not shown on the page
  facetLabel: string | null; // the second filter group's label; null = none
  facetSource: "CATEGORY" | "VARIANT_OPTION";
};

export type ListingVariant = {
  id: number;
  priceCents: number;
  stock: number;
  option1Value: string | null;
  option2Value: string | null;
};

// One visible product, as the query returns it: newest first, active variants
// only, in their position order.
export type ListingProduct = {
  slug: string;
  name: string;
  imageUrl: string | null;
  imageAlt: string | null;
  featured: boolean;
  productType: { slug: string; name: string; position: number };
  category: { slug: string; name: string } | null;
  option1Name: string | null;
  option2Name: string | null;
  variants: ListingVariant[];
};

// One filter link or select option. slug null = "All".
export type FilterOption = { slug: string | null; name: string };

type FacetValue = { slug: string; name: string };

export type FilterGroup = {
  label: string;
  options: FilterOption[]; // "All" first
  selected: string | null;
};

export type Filters = { type: string | null; facet: string | null };

// Everything the URL selects: the filters, the sort, and the page.
export type ListingState = Filters & { sort: SortKey; page: number };

// A card plus the variant its link selects (set only for a VARIANT_OPTION
// facet selection, so "Roja" opens the product on its red variant), and what
// compareCards orders by besides price and stock: featured, and rank, the
// product's index in the query order (0 = newest).
export type ListingCard = ProductCardView & { variantId: number | null; featured: boolean; rank: number };

export type Listing = {
  filters: ListingState; // page is the requested one, not clamped
  typeGroup: FilterGroup | null; // null = hidden
  facetGroup: FilterGroup | null;
  cards: ListingCard[]; // the requested page only; empty past the last page
  total: number; // every filtered card; 0 = "No results"
  totalPages: number; // at least 1
};

const ALL: FilterOption = { slug: null, name: "All" };

/**
 * The URL slug of a variant option value: "Siete colores" → "siete-colores".
 * The filter links and the parser both use it, so they always agree.
 */
export function facetValueSlug(value: string): string {
  return slugify(value);
}

export type SearchParam = string | string[] | undefined;

export function first(param: SearchParam): string | undefined {
  return Array.isArray(param) ? param[0] : param;
}

/**
 * ?type= and ?facet=, kept only when they name one of the collection's real
 * values. Anything else becomes null (All), so a bad link still shows a page.
 */
export function parseFilters(
  collection: ListingCollection,
  products: ListingProduct[],
  params: { type?: SearchParam; facet?: SearchParam },
): Filters {
  const type = first(params.type);
  const facet = first(params.facet);
  const typeSlugs = new Set(products.map((product) => product.productType.slug));
  const facetSlugs = new Set(products.flatMap((product) => facetValuesOf(collection, product).map((v) => v.slug)));
  return {
    type: type && typeSlugs.has(type) ? type : null,
    facet: facet && facetSlugs.has(facet) ? facet : null,
  };
}

/** Which of option1/option2 is the collection's facet, or null when the product has none. */
function facetOptionIndex(collection: ListingCollection, product: ListingProduct): 1 | 2 | null {
  if (collection.facetLabel === null) return null;
  if (product.option1Name === collection.facetLabel) return 1;
  if (product.option2Name === collection.facetLabel) return 2;
  return null;
}

function facetValueOfVariant(variant: ListingVariant, index: 1 | 2): string | null {
  return index === 1 ? variant.option1Value : variant.option2Value;
}

/**
 * The product's facet values. CATEGORY: its category, if any. VARIANT_OPTION:
 * the distinct values of the option named facetLabel across its active
 * variants. Empty = the product shows only under "All".
 */
export function facetValuesOf(collection: ListingCollection, product: ListingProduct): FacetValue[] {
  if (collection.facetLabel === null) return [];
  if (collection.facetSource === "CATEGORY") {
    return product.category ? [{ slug: product.category.slug, name: product.category.name }] : [];
  }

  const index = facetOptionIndex(collection, product);
  if (index === null) return [];
  const values = new Map<string, string>();
  for (const variant of product.variants) {
    const value = facetValueOfVariant(variant, index);
    if (value === null) continue;
    const slug = facetValueSlug(value);
    if (slug && !values.has(slug)) values.set(slug, value);
  }
  return [...values].map(([slug, name]) => ({ slug, name }));
}

/**
 * The variants a card describes: for a VARIANT_OPTION facet selection, only
 * the ones with that value (Roja's price and stock, not the white one's);
 * otherwise all of them.
 */
export function matchingVariants(
  collection: ListingCollection,
  product: ListingProduct,
  facet: string | null,
): ListingVariant[] {
  if (facet === null || collection.facetSource !== "VARIANT_OPTION") return product.variants;
  const index = facetOptionIndex(collection, product);
  if (index === null) return [];
  return product.variants.filter((variant) => {
    const value = facetValueOfVariant(variant, index);
    return value !== null && facetValueSlug(value) === facet;
  });
}

function matchesType(product: ListingProduct, type: string | null): boolean {
  return type === null || product.productType.slug === type;
}

function matchesFacet(collection: ListingCollection, product: ListingProduct, facet: string | null): boolean {
  return facet === null || facetValuesOf(collection, product).some((value) => value.slug === facet);
}

/** Types with a product under the current facet selection, by ProductType.position. */
export function typeOptions(
  collection: ListingCollection,
  products: ListingProduct[],
  facet: string | null,
): FilterOption[] {
  const types = new Map<string, ListingProduct["productType"]>();
  for (const product of products) {
    if (matchesFacet(collection, product, facet)) types.set(product.productType.slug, product.productType);
  }
  const sorted = [...types.values()].sort((a, b) => a.position - b.position || compareNames(a.name, b.name));
  return [ALL, ...sorted.map(({ slug, name }) => ({ slug, name }))];
}

/**
 * Facet values with a product under the current type selection. Categories
 * by name (Category has no position); option values alphabetically, since
 * nothing stores an order for them.
 */
export function facetOptions(
  collection: ListingCollection,
  products: ListingProduct[],
  type: string | null,
): FilterOption[] {
  const values = new Map<string, FacetValue>();
  for (const product of products) {
    if (!matchesType(product, type)) continue;
    for (const value of facetValuesOf(collection, product)) {
      if (!values.has(value.slug)) values.set(value.slug, value);
    }
  }
  const sorted = [...values.values()].sort((a, b) => compareNames(a.name, b.name));
  return [ALL, ...sorted];
}

function compareNames(a: string, b: string): number {
  return a.localeCompare(b, "en", { sensitivity: "base" });
}

/**
 * Shown with more than one option besides "All", or while it has a selection:
 * otherwise picking a facet could hide the Type group with a type still
 * selected, and the shopper couldn't see or clear it.
 */
export function isGroupVisible(options: FilterOption[], selected: string | null): boolean {
  return options.filter((option) => option.slug !== null).length > 1 || selected !== null;
}

/** A card priced and stocked from the variants that match the filter. */
export function toListingCard(product: ListingProduct, variants: ListingVariant[]): ProductCardView {
  const prices = variants.map((variant) => variant.priceCents);
  return {
    slug: product.slug,
    name: product.name,
    imageUrl: product.imageUrl,
    imageAlt: product.imageAlt,
    minPriceCents: Math.min(...prices),
    hasPriceRange: new Set(prices).size > 1,
    inStock: variants.some((variant) => variant.stock > 0),
  };
}

/**
 * The variant a card links to under a VARIANT_OPTION facet selection: the
 * first matching one with stock, otherwise the first matching one. Null for
 * any other filter: the product page picks its own.
 */
export function listingVariantId(
  collection: ListingCollection,
  product: ListingProduct,
  facet: string | null,
): number | null {
  if (facet === null || collection.facetSource !== "VARIANT_OPTION") return null;
  const variants = matchingVariants(collection, product, facet);
  return (variants.find((variant) => variant.stock > 0) ?? variants[0])?.id ?? null;
}

/**
 * Everything the collection page renders, from one fetch and the URL:
 *
 *   filter (type, facet) → cards (priced from the matching variants)
 *     → sort with compareCards(sort)   // sold out always last
 *     → total = cards.length           // counted BEFORE slicing
 *     → slice the requested page
 *
 * Counted before slicing because the count line and the page count describe
 * the whole filtered list. Sorted before slicing because page 4 must show
 * pieces 73–96 of the sorted whole, not a reordering of 24 already chosen.
 * The page isn't clamped: past the end, cards is empty and page.tsx redirects.
 */
export function buildListing(
  collection: ListingCollection,
  products: ListingProduct[],
  params: { type?: SearchParam; facet?: SearchParam; sort?: SearchParam; page?: SearchParam },
): Listing {
  const filters: ListingState = {
    ...parseFilters(collection, products, params),
    sort: parseSort(params.sort),
    page: parsePage(params.page),
  };

  const types = typeOptions(collection, products, filters.facet);
  const typeGroup = isGroupVisible(types, filters.type)
    ? { label: "Type", options: types, selected: filters.type }
    : null;

  let facetGroup: FilterGroup | null = null;
  if (collection.facetLabel !== null) {
    const facets = facetOptions(collection, products, filters.type);
    if (isGroupVisible(facets, filters.facet)) {
      facetGroup = { label: collection.facetLabel, options: facets, selected: filters.facet };
    }
  }

  const cards: ListingCard[] = [];
  products.forEach((product, rank) => {
    if (!matchesType(product, filters.type) || !matchesFacet(collection, product, filters.facet)) return;
    cards.push({
      // A product that matches the facet has a variant with it, so none is empty.
      ...toListingCard(product, matchingVariants(collection, product, filters.facet)),
      variantId: listingVariantId(collection, product, filters.facet),
      featured: product.featured,
      rank,
    });
  });

  const sorted = cards.toSorted(compareCards(filters.sort));
  const total = sorted.length;
  const start = (filters.page - 1) * PAGE_SIZE;

  return {
    filters,
    typeGroup,
    facetGroup,
    cards: sorted.slice(start, start + PAGE_SIZE),
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/**
 * /collections/{slug} with the given state, in the order type, facet, sort,
 * page. Null filters, the default sort (featured) and page 1 are left out, so
 * the default view and page 1 each have one URL. `hash` appends #hash (page
 * links pass "pieces" to land on the grid).
 */
export function collectionHref(
  slug: string,
  state: Filters & { sort?: SortKey; page?: number },
  options: { hash?: string } = {},
): string {
  const params = new URLSearchParams();
  if (state.type) params.set("type", state.type);
  if (state.facet) params.set("facet", state.facet);
  if (state.sort && state.sort !== "featured") params.set("sort", state.sort);
  if (state.page && state.page > 1) params.set("page", String(state.page));
  const query = params.toString();
  return `/collections/${slug}${query ? `?${query}` : ""}${options.hash ? `#${options.hash}` : ""}`;
}
