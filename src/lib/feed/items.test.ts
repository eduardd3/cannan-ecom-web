import { describe, expect, it } from "vitest";

import type { ProductVariantView } from "@/lib/catalog/types";
import {
  feedAvailability,
  feedDescription,
  feedLink,
  feedPrice,
  feedProductType,
  feedTitle,
  FINAL_SALE_RETURN_LABEL,
  MAX_ADDITIONAL_IMAGES,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  toFeedItems,
} from "./items";
import type { FeedProductView } from "./types";

// Fixture builders in the same style as lib/seo/product.test.ts: a valid
// default you override per test, so each test shows only what it's about.
let sequence = 0;
function variant(overrides: Partial<ProductVariantView> = {}): ProductVariantView {
  sequence += 1;
  return {
    id: sequence,
    sku: `SKU-${sequence}`,
    gtin: null,
    option1Value: null,
    option2Value: null,
    priceCents: 2400,
    stock: 3,
    dimensions: null,
    ...overrides,
  };
}

function product(overrides: Partial<FeedProductView> = {}): FeedProductView {
  return {
    id: 7,
    slug: "san-jose-statue",
    name: "San José Statue",
    description: "San José holding the Child.",
    material: null,
    brand: "Cannan",
    isFinalSale: false,
    productType: { slug: "statues", name: "Statues" },
    category: { slug: "san-jose", name: "San José" },
    option1Name: null,
    option2Name: null,
    images: [{ url: "/seed-images/products/a/1.jpg", alt: "Front", variantId: null }],
    variants: [variant()],
    ...overrides,
  };
}

/** The one item a single-variant product makes. */
function onlyItem(p: FeedProductView) {
  const items = toFeedItems([p]);
  expect(items).toHaveLength(1);
  return items[0];
}

function image(name: string, variantId: number | null = null) {
  return { url: `/seed-images/products/a/${name}.jpg`, alt: name, variantId };
}

describe("toFeedItems", () => {
  // Only active variants reach this point: getFeedProducts filters the rest.
  it("makes one item per active variant, in variant order", () => {
    const first = product({ id: 1, option1Name: "Size", variants: [variant({ id: 12 }), variant({ id: 11 })] });
    const second = product({ id: 2, variants: [variant({ id: 5 })] });
    expect(toFeedItems([first, second]).map((item) => item.id)).toEqual(["12", "11", "5"]);
  });

  it("uses the variant id as id, as a string", () => {
    const items = toFeedItems([sized()]);
    expect(items.map((item) => item.id)).toEqual(["101", "102"]);
    // Two variants of one product never share an id: Merchant Center would
    // treat them as one item and keep overwriting it.
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
  });

  it("sets itemGroupId to the product id only when the product has options", () => {
    for (const item of toFeedItems([sized()])) expect(item.itemGroupId).toBe("7");
    expect(onlyItem(product()).itemGroupId).toBeUndefined();
  });

  it("puts the variant's own image first, then shared images, at most 10 additional", () => {
    const p = product({
      option1Name: "Color",
      images: [image("shared"), image("roja", 201)],
      variants: [variant({ id: 201, option1Value: "Roja" }), variant({ id: 202, option1Value: "Azul" })],
    });
    const [roja, azul] = toFeedItems([p]);
    expect(roja.imageLink).toBe("https://www.shopcannan.com/seed-images/products/a/roja.jpg");
    expect(roja.additionalImageLinks).toEqual(["https://www.shopcannan.com/seed-images/products/a/shared.jpg"]);
    expect(azul.imageLink).toBe("https://www.shopcannan.com/seed-images/products/a/shared.jpg");
    expect(azul.additionalImageLinks).toEqual([]);

    const many = product({ images: Array.from({ length: 15 }, (_, i) => image(String(i))) });
    const item = onlyItem(many);
    expect(item.imageLink).toContain("/0.jpg");
    expect(item.additionalImageLinks).toHaveLength(MAX_ADDITIONAL_IMAGES);
    expect(item.additionalImageLinks[0]).toContain("/1.jpg"); // the second image, not the third
  });

  it("leaves out a variant with no image at all", () => {
    expect(toFeedItems([product({ images: [] })])).toEqual([]);
    // Only variant 301 has a photo, and nothing is shared.
    const p = product({
      option1Name: "Color",
      images: [image("roja", 301)],
      variants: [variant({ id: 301, option1Value: "Roja" }), variant({ id: 302, option1Value: "Azul" })],
    });
    expect(toFeedItems([p]).map((item) => item.id)).toEqual(["301"]);
  });

  it("sends brand + mpn (the SKU) when there's no gtin", () => {
    const item = onlyItem(product({ variants: [variant({ sku: "SJ-12" })] }));
    expect(item.brand).toBe("Cannan");
    expect(item.mpn).toBe("SJ-12");
    expect(item.gtin).toBeUndefined();
    expect(item.identifierExists).toBeUndefined();
  });

  it("sends brand + gtin and no mpn when there's a gtin (Bibles)", () => {
    const bible = product({
      brand: "Catholic Book Publishing",
      productType: { slug: "bibles", name: "Bibles" },
      variants: [variant({ sku: "BIB-NABRE", gtin: "9781941243954" })],
    });
    const item = onlyItem(bible);
    expect(item.brand).toBe("Catholic Book Publishing");
    expect(item.gtin).toBe("9781941243954");
    expect(item.mpn).toBeUndefined();
    expect(item.identifierExists).toBeUndefined();
  });

  it("sends identifierExists 'no' and no identifiers when brand is null", () => {
    const item = onlyItem(product({ brand: null, variants: [variant({ gtin: "9781941243954" })] }));
    expect(item.identifierExists).toBe("no");
    expect(item.brand).toBeUndefined();
    expect(item.gtin).toBeUndefined();
    expect(item.mpn).toBeUndefined();
  });

  it("fills size and color from options named Size and Color, any case", () => {
    const both = product({
      option1Name: "COLOR",
      option2Name: " size ",
      variants: [variant({ option1Value: "Roja", option2Value: "8 in" })],
    });
    const item = onlyItem(both);
    expect(item.color).toBe("Roja");
    expect(item.size).toBe("8 in");

    // An option Google can't vary by fills neither.
    const style = onlyItem(product({ option1Name: "Style", variants: [variant({ option1Value: "Antique" })] }));
    expect(style.color).toBeUndefined();
    expect(style.size).toBeUndefined();

    const plain = onlyItem(product());
    expect(plain.color).toBeUndefined();
    expect(plain.size).toBeUndefined();
  });

  it("maps the product type slug to its Google category id", () => {
    expect(onlyItem(product()).googleProductCategory).toBe("97");
    const bible = product({ productType: { slug: "bibles", name: "Bibles" } });
    expect(onlyItem(bible).googleProductCategory).toBe("543543");
    // A type without an entry leaves the tag out rather than sending a wrong one.
    const unmapped = product({ productType: { slug: "rosaries", name: "Rosaries" } });
    expect(onlyItem(unmapped).googleProductCategory).toBeUndefined();
  });

  it("labels final-sale products 'final-sale' and leaves the label off the rest", () => {
    expect(onlyItem(product({ isFinalSale: true })).returnPolicyLabel).toBe(FINAL_SALE_RETURN_LABEL);
    expect(FINAL_SALE_RETURN_LABEL).toBe("final-sale");
    expect(onlyItem(product()).returnPolicyLabel).toBeUndefined();
  });

  it("fills the fields every item has", () => {
    expect(onlyItem(product({ variants: [variant({ priceCents: 3400, stock: 0 })] }))).toMatchObject({
      title: "San José Statue",
      description: "San José holding the Child.",
      link: "https://www.shopcannan.com/products/san-jose-statue",
      availability: "out_of_stock",
      price: "34.00 USD",
      condition: "new",
      productType: "Statues > San José",
    });
  });
});

// The simple helpers, tested directly.

function sized(): FeedProductView {
  return product({
    option1Name: "Size",
    variants: [variant({ id: 101, option1Value: "8 in" }), variant({ id: 102, option1Value: "12 in" })],
  });
}

describe("feedTitle", () => {
  it("titles a variant 'Name, label' and a single-variant product just 'Name'", () => {
    const p = sized();
    expect(feedTitle(p, p.variants[1])).toBe("San José Statue, 12 in");
    const single = product();
    expect(feedTitle(single, single.variants[0])).toBe("San José Statue");
  });

  it("joins two option values like the JSON-LD does", () => {
    const p = product({ option1Name: "Color", option2Name: "Size" });
    expect(feedTitle(p, variant({ option1Value: "Roja", option2Value: "8 in" }))).toBe("San José Statue, Roja · 8 in");
  });

  it("leaves a title of exactly the limit as it is", () => {
    const name = "a".repeat(MAX_TITLE_LENGTH);
    expect(feedTitle(product({ name }), variant())).toBe(name);
  });

  it("cuts a long title at the last word that fits", () => {
    // 149 characters of words, then one more word that crosses 150.
    const name = `${"word ".repeat(29)}word overflow`;
    const title = feedTitle(product({ name }), variant());
    expect(title.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    expect(title).toBe(`${"word ".repeat(29)}word`);
  });

  it("keeps a word that ends exactly at the limit", () => {
    const name = `${"a".repeat(MAX_TITLE_LENGTH - 4)} bcd efg`; // "bcd" ends at 150
    expect(feedTitle(product({ name }), variant())).toBe(`${"a".repeat(MAX_TITLE_LENGTH - 4)} bcd`);
  });

  it("cuts mid-word when there's no space to cut at", () => {
    const name = "a".repeat(MAX_TITLE_LENGTH + 20);
    expect(feedTitle(product({ name }), variant())).toBe("a".repeat(MAX_TITLE_LENGTH));
  });

  it("never splits an emoji in half", () => {
    // The 🙏 (two UTF-16 units) straddles the limit: units 150 and 151.
    const name = `${"a".repeat(MAX_TITLE_LENGTH - 1)}🙏bc`;
    const title = feedTitle(product({ name }), variant());
    expect(title).toBe("a".repeat(MAX_TITLE_LENGTH - 1));
    expect(title).not.toMatch(/[\uD800-\uDBFF]$/);
  });

  it("counts the variant label toward the limit", () => {
    const name = "a".repeat(MAX_TITLE_LENGTH - 2);
    const p = product({ name, option1Name: "Size" });
    // "aaa…a, 12 in" is too long; the label is the part that goes.
    expect(feedTitle(p, variant({ option1Value: "12 in" }))).toBe(`${name},`);
  });
});

describe("feedLink", () => {
  it("links to ?variant= only when the product has options, on www", () => {
    const p = sized();
    expect(feedLink(p, p.variants[0])).toBe("https://www.shopcannan.com/products/san-jose-statue?variant=101");
    const single = product();
    expect(feedLink(single, single.variants[0])).toBe("https://www.shopcannan.com/products/san-jose-statue");
  });
});

describe("feedAvailability", () => {
  it("marks stock 0 as out_of_stock and stock > 0 as in_stock", () => {
    expect(feedAvailability(0)).toBe("out_of_stock");
    expect(feedAvailability(1)).toBe("in_stock");
    expect(feedAvailability(40)).toBe("in_stock");
  });

  it("treats negative stock as out_of_stock (the database forbids it; a guard)", () => {
    expect(feedAvailability(-1)).toBe("out_of_stock");
  });
});

describe("feedPrice", () => {
  it("formats prices as '34.00 USD', including under a dollar ('0.05 USD')", () => {
    expect(feedPrice(3400)).toBe("34.00 USD");
    expect(feedPrice(3850)).toBe("38.50 USD");
    expect(feedPrice(5)).toBe("0.05 USD");
  });

  it("keeps two decimals on whole dollars and zero", () => {
    expect(feedPrice(100)).toBe("1.00 USD");
    expect(feedPrice(0)).toBe("0.00 USD");
  });
});

describe("feedProductType", () => {
  it("builds product_type as 'Type > Category', or just the type", () => {
    expect(feedProductType(product())).toBe("Statues > San José");
    expect(feedProductType(product({ productType: { slug: "bibles", name: "Bibles" }, category: null }))).toBe(
      "Bibles",
    );
  });
});

describe("feedDescription", () => {
  it("trims surrounding whitespace and keeps the rest as it is", () => {
    expect(feedDescription("  San José holding the Child.\n\n")).toBe("San José holding the Child.");
    expect(feedDescription("Line one.\nLine two.")).toBe("Line one.\nLine two.");
  });

  it("caps the description at 5,000 characters, at a word", () => {
    const description = "word ".repeat(1200); // 6,000 characters
    const result = feedDescription(description);
    expect(result.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
    expect(result.endsWith("word")).toBe(true);
  });

  it("trims before measuring, so padding doesn't push it over", () => {
    const text = "a".repeat(MAX_DESCRIPTION_LENGTH);
    expect(feedDescription(`   ${text}   `)).toBe(text);
  });
});
