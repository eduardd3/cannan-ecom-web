import { describe, expect, it } from "vitest";

import {
  buildListing,
  collectionHref,
  facetOptions,
  facetValueSlug,
  facetValuesOf,
  isGroupVisible,
  matchingVariants,
  parseFilters,
  sortInStockFirst,
  toListingCard,
  typeOptions,
  type ListingCollection,
  type ListingProduct,
  type ListingVariant,
} from "./listing";
import type { ProductCardView } from "./types";

const signature: ListingCollection = {
  slug: "signature",
  name: "Signature",
  description: "",
  facetLabel: "Devotion",
  facetSource: "CATEGORY",
};

const santaMuerte: ListingCollection = {
  slug: "santa-muerte",
  name: "Santa Muerte",
  description: "",
  facetLabel: "Color",
  facetSource: "VARIANT_OPTION",
};

const statues = { slug: "statues", name: "Statues", position: 1 };
const candles = { slug: "candles", name: "Candles", position: 2 };
const bibles = { slug: "bibles", name: "Bibles", position: 6 };

function variant(overrides: Partial<ListingVariant> = {}): ListingVariant {
  return { priceCents: 3000, stock: 1, option1Value: null, option2Value: null, ...overrides };
}

let sequence = 0;
function product(overrides: Partial<ListingProduct> = {}): ListingProduct {
  sequence += 1;
  return {
    slug: `product-${sequence}`,
    name: `Product ${sequence}`,
    imageUrl: null,
    imageAlt: null,
    productType: statues,
    category: null,
    option1Name: null,
    option2Name: null,
    variants: [variant()],
    ...overrides,
  };
}

const guadalupe = { slug: "guadalupe", name: "Nuestra Señora de Guadalupe" };
const sanJose = { slug: "san-jose", name: "San José" };

function colored(colors: { value: string; priceCents?: number; stock?: number }[], overrides: Partial<ListingProduct> = {}) {
  return product({
    option1Name: "Color",
    variants: colors.map(({ value, priceCents, stock }) => variant({ option1Value: value, priceCents, stock })),
    ...overrides,
  });
}

describe("facetValueSlug", () => {
  it("lowercases, hyphenates, and drops accents", () => {
    expect(facetValueSlug("Siete colores")).toBe("siete-colores");
    expect(facetValueSlug("Dorada")).toBe("dorada");
    expect(facetValueSlug("Señora")).toBe("senora");
  });
});

describe("facetValuesOf", () => {
  it("is the product's category in a CATEGORY collection", () => {
    expect(facetValuesOf(signature, product({ category: guadalupe }))).toEqual([guadalupe]);
    expect(facetValuesOf(signature, product())).toEqual([]);
  });

  it("is the distinct values of the option named facetLabel, from option 1", () => {
    const p = colored([{ value: "Roja" }, { value: "Blanca" }, { value: "Roja" }]);
    expect(facetValuesOf(santaMuerte, p)).toEqual([
      { slug: "roja", name: "Roja" },
      { slug: "blanca", name: "Blanca" },
    ]);
  });

  it("reads option 2 when that's the one named facetLabel", () => {
    const p = product({
      option1Name: "Size",
      option2Name: "Color",
      variants: [variant({ option1Value: "12 in", option2Value: "Negra" })],
    });
    expect(facetValuesOf(santaMuerte, p)).toEqual([{ slug: "negra", name: "Negra" }]);
  });

  it("is empty for a product without that option", () => {
    const p = product({ option1Name: "Size", variants: [variant({ option1Value: "12 in" })] });
    expect(facetValuesOf(santaMuerte, p)).toEqual([]);
  });

  it("is empty when the collection has no facet", () => {
    expect(facetValuesOf({ ...signature, facetLabel: null }, product({ category: guadalupe }))).toEqual([]);
  });
});

describe("matchingVariants", () => {
  const p = colored([
    { value: "Roja", priceCents: 4800 },
    { value: "Blanca", priceCents: 3400 },
  ]);

  it("keeps only the selected option value's variants", () => {
    expect(matchingVariants(santaMuerte, p, "roja").map((v) => v.priceCents)).toEqual([4800]);
  });

  it("keeps every variant without a selection", () => {
    expect(matchingVariants(santaMuerte, p, null)).toHaveLength(2);
  });

  it("keeps every variant for a CATEGORY facet", () => {
    expect(matchingVariants(signature, p, "guadalupe")).toHaveLength(2);
  });
});

describe("parseFilters", () => {
  const products = [product({ category: guadalupe }), product({ productType: candles, category: sanJose })];

  it("keeps values the collection has", () => {
    expect(parseFilters(signature, products, { type: "candles", facet: "guadalupe" })).toEqual({
      type: "candles",
      facet: "guadalupe",
    });
  });

  it("drops unknown values", () => {
    expect(parseFilters(signature, products, { type: "rosaries", facet: "nope" })).toEqual({ type: null, facet: null });
  });

  it("drops a real type that no product in the collection has", () => {
    expect(parseFilters(signature, products, { type: "bibles" }).type).toBeNull();
  });

  it("takes the first of a repeated parameter", () => {
    expect(parseFilters(signature, products, { type: ["statues", "candles"] }).type).toBe("statues");
  });

  it("ignores facet when the collection has no facet", () => {
    expect(parseFilters({ ...signature, facetLabel: null }, products, { facet: "guadalupe" }).facet).toBeNull();
  });
});

describe("typeOptions and facetOptions", () => {
  const products = [
    product({ productType: candles, category: guadalupe }),
    product({ productType: statues, category: sanJose }),
    product({ productType: bibles }),
    product({ productType: statues, category: guadalupe }),
  ];

  it("lists types by position, All first", () => {
    expect(typeOptions(signature, products, null).map((o) => o.slug)).toEqual([null, "statues", "candles", "bibles"]);
  });

  it("lists only types with a product under the facet selection", () => {
    expect(typeOptions(signature, products, "san-jose").map((o) => o.slug)).toEqual([null, "statues"]);
  });

  it("lists categories by name under the type selection", () => {
    expect(facetOptions(signature, products, null).map((o) => o.name)).toEqual([
      "All",
      "Nuestra Señora de Guadalupe",
      "San José",
    ]);
    expect(facetOptions(signature, products, "candles").map((o) => o.slug)).toEqual([null, "guadalupe"]);
  });

  it("lists option values alphabetically, ignoring case", () => {
    const sm = [colored([{ value: "roja" }, { value: "Blanca" }]), colored([{ value: "Negra" }])];
    expect(facetOptions(santaMuerte, sm, null).map((o) => o.name)).toEqual(["All", "Blanca", "Negra", "roja"]);
  });
});

describe("isGroupVisible", () => {
  const all = { slug: null, name: "All" };
  const one = { slug: "a", name: "A" };
  const two = { slug: "b", name: "B" };

  it("shows a group with more than one option besides All", () => {
    expect(isGroupVisible([all, one, two], null)).toBe(true);
  });

  it("hides a group with one option and no selection", () => {
    expect(isGroupVisible([all, one], null)).toBe(false);
  });

  it("shows a group with an active selection, even with one option", () => {
    expect(isGroupVisible([all, one], "a")).toBe(true);
  });
});

describe("toListingCard", () => {
  it("prices from the cheapest variant and flags a range", () => {
    const p = product();
    const card = toListingCard(p, [variant({ priceCents: 5200 }), variant({ priceCents: 3400 })]);
    expect(card.minPriceCents).toBe(3400);
    expect(card.hasPriceRange).toBe(true);
  });

  it("has no range when the prices match", () => {
    expect(toListingCard(product(), [variant(), variant()]).hasPriceRange).toBe(false);
  });

  it("is in stock when any given variant has stock", () => {
    expect(toListingCard(product(), [variant({ stock: 0 }), variant({ stock: 2 })]).inStock).toBe(true);
    expect(toListingCard(product(), [variant({ stock: 0 })]).inStock).toBe(false);
  });
});

describe("sortInStockFirst", () => {
  it("moves sold-out cards last and keeps the order within each", () => {
    const card = (slug: string, inStock: boolean) => ({ slug, inStock }) as ProductCardView;
    const sorted = sortInStockFirst([card("a", false), card("b", true), card("c", false), card("d", true)]);
    expect(sorted.map((c) => c.slug)).toEqual(["b", "d", "a", "c"]);
  });
});

describe("buildListing", () => {
  it("prices and stocks cards from the variants matching the color", () => {
    const p = colored([
      { value: "Blanca", priceCents: 3400, stock: 5 },
      { value: "Roja", priceCents: 4800, stock: 0 },
      { value: "Roja", priceCents: 5200, stock: 0 },
    ]);
    const [card] = buildListing(santaMuerte, [p], { facet: "roja" }).cards;
    expect(card).toMatchObject({ minPriceCents: 4800, hasPriceRange: true, inStock: false });
  });

  it("lists a product without the facet option only under All", () => {
    const plain = product({ option1Name: "Size", variants: [variant({ option1Value: "12 in" })] });
    const red = colored([{ value: "Roja" }]);
    expect(buildListing(santaMuerte, [plain, red], {}).cards).toHaveLength(2);
    expect(buildListing(santaMuerte, [plain, red], { facet: "roja" }).cards.map((c) => c.slug)).toEqual([red.slug]);
  });

  it("returns no cards for a valid but empty combination", () => {
    const products = [product({ productType: candles, category: guadalupe }), product({ category: sanJose })];
    const listing = buildListing(signature, products, { type: "candles", facet: "san-jose" });
    expect(listing.filters).toEqual({ type: "candles", facet: "san-jose" });
    expect(listing.cards).toEqual([]);
  });

  it("keeps the Type group while a type is selected, even with one type left", () => {
    const products = [product({ productType: candles, category: guadalupe }), product({ category: sanJose })];
    const listing = buildListing(signature, products, { type: "statues", facet: "san-jose" });
    expect(listing.typeGroup?.options.map((o) => o.slug)).toEqual([null, "statues"]);
    expect(listing.typeGroup?.selected).toBe("statues");
  });

  it("hides the Type group when the collection has one type", () => {
    const products = [product({ category: guadalupe }), product({ category: sanJose })];
    expect(buildListing(signature, products, {}).typeGroup).toBeNull();
  });

  it("has no facet group when the collection has no facetLabel", () => {
    const products = [product({ category: guadalupe }), product({ category: sanJose })];
    expect(buildListing({ ...signature, facetLabel: null }, products, {}).facetGroup).toBeNull();
  });
});

describe("collectionHref", () => {
  it("leaves out null filters", () => {
    expect(collectionHref("signature", { type: null, facet: null })).toBe("/collections/signature");
    expect(collectionHref("signature", { type: "statues", facet: null })).toBe("/collections/signature?type=statues");
    expect(collectionHref("santa-muerte", { type: "statues", facet: "roja" })).toBe(
      "/collections/santa-muerte?type=statues&facet=roja",
    );
  });
});
