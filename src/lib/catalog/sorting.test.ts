import { describe, expect, it } from "vitest";

import { buildListing, type ListingCard, type ListingCollection, type ListingProduct } from "./listing";
import { compareCards, parsePage, parseSort, SORT_OPTIONS } from "./sorting";

// L1–L3 (Lalo). The rules are in each function's doc comment in sorting.ts.

let sequence = 0;
function card(overrides: Partial<ListingCard> = {}): ListingCard {
  sequence += 1;
  return {
    slug: `card-${sequence}`,
    name: `Card ${sequence}`,
    imageUrl: null,
    imageAlt: null,
    minPriceCents: 3000,
    hasPriceRange: false,
    inStock: true,
    variantId: null,
    featured: false,
    rank: sequence,
    ...overrides,
  };
}

const slugs = (cards: ListingCard[]) => cards.map((c) => c.slug);

describe("parseSort", () => {
  it("valid: newest, price-asc and price-desc each return that key", () => {
    expect(parseSort("newest")).toBe("newest");
    expect(parseSort("price-asc")).toBe("price-asc");
    expect(parseSort("price-desc")).toBe("price-desc");
  });

  it("featured returns featured", () => {
    expect(parseSort("featured")).toBe("featured");
  });

  it("missing returns featured", () => {
    expect(parseSort(undefined)).toBe("featured");
  });

  it("unknown value returns featured", () => {
    expect(parseSort("cheapest")).toBe("featured");
    expect(parseSort("")).toBe("featured");
    expect(parseSort("PRICE-ASC")).toBe("featured");
  });

  it("array: uses a valid first value", () => {
    expect(parseSort(["price-asc", "newest"])).toBe("price-asc");
  });

  it("array whose first value isn't valid returns featured", () => {
    expect(parseSort(["junk", "newest"])).toBe("featured");
  });
});

describe("parsePage", () => {
  it("valid", () => {
    expect(parsePage("1")).toBe(1);
    expect(parsePage("3")).toBe(3);
    expect(parsePage("999")).toBe(999); // not capped here
  });

  it("zero", () => {
    expect(parsePage("0")).toBe(1);
  });

  it("negative", () => {
    expect(parsePage("-2")).toBe(1);
  });

  it("decimal", () => {
    expect(parsePage("2.5")).toBe(1);
  });

  it("non-numeric", () => {
    expect(parsePage("abc")).toBe(1);
  });

  it("empty", () => {
    expect(parsePage("")).toBe(1);
  });

  it("missing", () => {
    expect(parsePage(undefined)).toBe(1);
  });

  it("array", () => {
    expect(parsePage(["2", "3"])).toBe(2);
    expect(parsePage(["abc", "3"])).toBe(1);
  });
});

describe("compareCards", () => {
  it("sold out last under each sort", () => {
    // Each sold-out card would win on at least one sort's key if stock didn't come first.
    const inStock = card({ slug: "in-stock", minPriceCents: 3000, rank: 5 });
    const cheapFeatured = card({ slug: "sold-cheap", inStock: false, featured: true, minPriceCents: 1000, rank: 0 });
    const pricey = card({ slug: "sold-pricey", inStock: false, minPriceCents: 9000, rank: 1 });

    for (const { key } of SORT_OPTIONS) {
      const sorted = [pricey, cheapFeatured, inStock].toSorted(compareCards(key));
      expect(sorted[0].slug, key).toBe("in-stock");
    }
  });

  it("featured first", () => {
    const plainNew = card({ slug: "plain-new", rank: 0 });
    const featuredOld = card({ slug: "featured-old", featured: true, rank: 4 });
    const featuredNewer = card({ slug: "featured-newer", featured: true, rank: 2 });

    const sorted = [plainNew, featuredOld, featuredNewer].toSorted(compareCards("featured"));
    expect(slugs(sorted)).toEqual(["featured-newer", "featured-old", "plain-new"]);
  });

  it("newest orders by rank", () => {
    const sorted = [card({ slug: "c", rank: 2 }), card({ slug: "a", rank: 0 }), card({ slug: "b", rank: 1 })].toSorted(
      compareCards("newest"),
    );
    expect(slugs(sorted)).toEqual(["a", "b", "c"]);
  });

  it("price-asc and price-desc order by minPriceCents", () => {
    const cheap = card({ slug: "cheap", minPriceCents: 1000, rank: 2 });
    const mid = card({ slug: "mid", minPriceCents: 3000, rank: 0 });
    const pricey = card({ slug: "pricey", minPriceCents: 9000, rank: 1 });
    const cards = [mid, pricey, cheap];

    expect(slugs(cards.toSorted(compareCards("price-asc")))).toEqual(["cheap", "mid", "pricey"]);
    expect(slugs(cards.toSorted(compareCards("price-desc")))).toEqual(["pricey", "mid", "cheap"]);
  });

  it("equal prices fall back to rank", () => {
    const older = card({ slug: "older", minPriceCents: 3000, rank: 7 });
    const newer = card({ slug: "newer", minPriceCents: 3000, rank: 3 });

    // Lower rank first in BOTH directions: the tiebreak doesn't flip with the price.
    expect(slugs([older, newer].toSorted(compareCards("price-asc")))).toEqual(["newer", "older"]);
    expect(slugs([older, newer].toSorted(compareCards("price-desc")))).toEqual(["newer", "older"]);
  });

  // Through buildListing, so the card is priced from the matching variants.
  it("price uses the matching-variant price (a Roja filter sorts by the red variants' price)", () => {
    const santaMuerte: ListingCollection = {
      slug: "santa-muerte",
      name: "Santa Muerte",
      description: "",
      facetLabel: "Color",
      facetSource: "VARIANT_OPTION",
    };
    const base = {
      imageUrl: null,
      imageAlt: null,
      featured: false,
      productType: { slug: "candles", name: "Candles", position: 1 },
      category: null,
      option1Name: "Color",
      option2Name: null,
    };
    // Cheapest overall ($10 white), but its red variant is the priciest ($50).
    const twoColor: ListingProduct = {
      ...base,
      slug: "two-color",
      name: "Two color",
      variants: [
        { id: 1, priceCents: 5000, stock: 1, option1Value: "Roja", option2Value: null },
        { id: 2, priceCents: 1000, stock: 1, option1Value: "Blanca", option2Value: null },
      ],
    };
    const redOnly: ListingProduct = {
      ...base,
      slug: "red-only",
      name: "Red only",
      variants: [{ id: 3, priceCents: 3000, stock: 1, option1Value: "Roja", option2Value: null }],
    };
    const products = [twoColor, redOnly];

    const all = buildListing(santaMuerte, products, { sort: "price-asc" });
    expect(slugs(all.cards)).toEqual(["two-color", "red-only"]);

    const roja = buildListing(santaMuerte, products, { sort: "price-asc", facet: "roja" });
    expect(slugs(roja.cards)).toEqual(["red-only", "two-color"]);
  });
});
