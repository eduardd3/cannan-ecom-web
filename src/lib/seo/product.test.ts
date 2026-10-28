import { describe, expect, it } from "vitest";

import { breadcrumbParts } from "@/lib/catalog/product-detail";
import type { ProductDetailView, ProductVariantView } from "@/lib/catalog/types";
import { buildBreadcrumbJsonLd, buildProductJsonLd, formatPrice } from "./product";

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

function product(overrides: Partial<ProductDetailView> = {}): ProductDetailView {
  return {
    id: 7,
    slug: "san-jose-statue",
    name: "San José Statue",
    description: "San José holding the Child.",
    material: null,
    brand: null,
    isFinalSale: false,
    collection: { slug: "signature", name: "Signature", facetLabel: "Devotion", facetSource: "CATEGORY", typeFilterVisible: true },
    productType: { slug: "statues", name: "Statues" },
    category: { slug: "san-jose", name: "San José" },
    option1Name: null,
    option2Name: null,
    images: [{ url: "/seed-images/products/a/1.jpg", alt: "Front", variantId: null }],
    variants: [variant()],
    ...overrides,
  };
}

function sized(): ProductDetailView {
  return product({
    option1Name: "Size",
    variants: [
      variant({ id: 101, sku: "SJ-08", option1Value: "8 in", priceCents: 2400 }),
      variant({ id: 102, sku: "SJ-12", option1Value: "12 in", priceCents: 3850 }),
      variant({ id: 103, sku: "SJ-18", option1Value: "18 in", priceCents: 6400, stock: 0 }),
    ],
  });
}

// The JSON-LD types are unions; tests read the output as plain JSON.
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const json = (data: unknown): Json => JSON.parse(JSON.stringify(data));

describe("formatPrice", () => {
  it("writes cents with two decimals", () => {
    expect(formatPrice(2400)).toBe("24.00");
    expect(formatPrice(1999)).toBe("19.99");
    expect(formatPrice(5)).toBe("0.05");
  });
});

describe("buildProductJsonLd", () => {
  it("is a Product with one Offer when the product has no options", () => {
    const data = json(buildProductJsonLd(product()));
    expect(data["@type"]).toBe("Product");
    expect(data.url).toBe("https://www.shopcannan.com/products/san-jose-statue");
    expect(data.image).toEqual(["https://www.shopcannan.com/seed-images/products/a/1.jpg"]);
    expect(data.offers).toEqual({
      "@type": "Offer",
      url: "https://www.shopcannan.com/products/san-jose-statue",
      price: "24.00",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    });
  });

  it("is a ProductGroup with one Product per active variant", () => {
    const data = json(buildProductJsonLd(sized()));
    expect(data["@type"]).toBe("ProductGroup");
    expect(data.productGroupID).toBe("7");
    expect(data.hasVariant.map((v: Json) => v.sku)).toEqual(["SJ-08", "SJ-12", "SJ-18"]);
    expect(data.hasVariant[1].name).toBe("San José Statue, 12 in");
    expect(data.hasVariant[1].size).toBe("12 in");
  });

  it("describes only the variants it's given (the page's active list)", () => {
    const p = sized();
    const data = json(buildProductJsonLd({ ...p, variants: p.variants.slice(0, 2) }));
    expect(data.hasVariant).toHaveLength(2);
  });

  it("sets availability per variant", () => {
    const data = json(buildProductJsonLd(sized()));
    expect(data.hasVariant.map((v: Json) => v.offers.availability)).toEqual([
      "https://schema.org/InStock",
      "https://schema.org/InStock",
      "https://schema.org/OutOfStock",
    ]);
  });

  it("gives each variant its exact price and never an AggregateOffer", () => {
    const data = buildProductJsonLd(sized());
    expect(json(data).hasVariant.map((v: Json) => v.offers.price)).toEqual(["24.00", "38.50", "64.00"]);
    expect(JSON.stringify(data)).not.toContain("AggregateOffer");
    expect(JSON.stringify(data)).not.toContain("lowPrice");
  });

  it("links variant offers with ?variant= and the group without it", () => {
    const data = json(buildProductJsonLd(sized()));
    expect(data.url).toBe("https://www.shopcannan.com/products/san-jose-statue");
    expect(data.hasVariant[0].offers.url).toBe("https://www.shopcannan.com/products/san-jose-statue?variant=101");
  });

  it("includes brand, material and gtin only when set", () => {
    const bare = json(buildProductJsonLd(product()));
    expect(bare).not.toHaveProperty("brand");
    expect(bare).not.toHaveProperty("material");
    expect(bare).not.toHaveProperty("gtin");

    const full = json(
      buildProductJsonLd(product({ brand: "Cannan", material: "Resin", variants: [variant({ gtin: "012345678905" })] })),
    );
    expect(full.brand).toEqual({ "@type": "Brand", name: "Cannan" });
    expect(full.material).toBe("Resin");
    expect(full.gtin).toBe("012345678905");

    const group = json(buildProductJsonLd({ ...sized(), brand: "Cannan" }));
    expect(group.brand.name).toBe("Cannan");
    expect(group.hasVariant[0]).not.toHaveProperty("gtin");
  });

  it("uses the variant's SKU", () => {
    expect(json(buildProductJsonLd(product({ variants: [variant({ sku: "SIG-GUA-STA" })] }))).sku).toBe("SIG-GUA-STA");
  });

  it("adds the not-returnable policy only to final-sale offers", () => {
    expect(json(buildProductJsonLd(product())).offers).not.toHaveProperty("hasMerchantReturnPolicy");
    expect(json(buildProductJsonLd(product({ isFinalSale: true }))).offers.hasMerchantReturnPolicy).toEqual({
      "@type": "MerchantReturnPolicy",
      applicableCountry: ["US", "PR"],
      returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
    });
    const group = json(buildProductJsonLd({ ...sized(), isFinalSale: true }));
    expect(group.hasVariant.every((v: Json) => v.offers.hasMerchantReturnPolicy)).toBe(true);
  });

  it("maps Color and Size to variesBy, case-insensitively, and leaves out other names", () => {
    const data = json(
      buildProductJsonLd(
        product({
          option1Name: "color",
          option2Name: "Size",
          variants: [variant({ option1Value: "Roja", option2Value: "8 in" })],
        }),
      ),
    );
    expect(data.variesBy).toEqual(["https://schema.org/color", "https://schema.org/size"]);
    expect(data.hasVariant[0]).toMatchObject({ color: "Roja", size: "8 in", name: "San José Statue, Roja · 8 in" });

    const scent = json(
      buildProductJsonLd(product({ option1Name: "Scent", variants: [variant({ option1Value: "Rose" })] })),
    );
    expect(scent.variesBy).toEqual([]);
    expect(scent.hasVariant[0]).not.toHaveProperty("scent");
  });

  it("puts a variant's own images first, and falls back to them for the group", () => {
    const p = product({
      option1Name: "Color",
      images: [
        { url: "/seed-images/roja.jpg", alt: "Roja", variantId: 201 },
        { url: "https://cdn.example.com/blanca.jpg", alt: "Blanca", variantId: 202 },
      ],
      variants: [variant({ id: 201, option1Value: "Roja" }), variant({ id: 202, option1Value: "Blanca" })],
    });
    const data = json(buildProductJsonLd(p));
    expect(data.image).toEqual(["https://www.shopcannan.com/seed-images/roja.jpg"]);
    expect(data.hasVariant[1].image).toEqual(["https://cdn.example.com/blanca.jpg"]);
  });
});

describe("buildBreadcrumbJsonLd", () => {
  const items = (p: ProductDetailView) => json(buildBreadcrumbJsonLd(breadcrumbParts(p), p.name)).itemListElement;

  it("Signature by devotion: collection, devotion, then the product without a URL", () => {
    expect(items(product())).toEqual([
      { "@type": "ListItem", position: 1, name: "Signature", item: "https://www.shopcannan.com/collections/signature" },
      { "@type": "ListItem", position: 2, name: "San José", item: "https://www.shopcannan.com/collections/signature?facet=san-jose" },
      { "@type": "ListItem", position: 3, name: "San José Statue" },
    ]);
  });

  it("Signature by type, when the product honors no one", () => {
    const list = items(product({ category: null, name: "Wall Crucifix" }));
    expect(list[1]).toMatchObject({ name: "Statues", item: "https://www.shopcannan.com/collections/signature?type=statues" });
  });

  it("Orishas by Orisha", () => {
    const list = items(
      product({
        name: "Oshún Statue",
        collection: { slug: "orishas", name: "Orishas", facetLabel: "Orisha", facetSource: "CATEGORY", typeFilterVisible: false },
        category: { slug: "oshun", name: "Oshún" },
      }),
    );
    expect(list.map((item: Json) => item.name)).toEqual(["Orishas", "Oshún", "Oshún Statue"]);
    expect(list[1].item).toBe("https://www.shopcannan.com/collections/orishas?facet=oshun");
  });

  it("Santa Muerte still has two items", () => {
    const list = items(
      product({
        name: "Santa Muerte Throne Statue",
        collection: { slug: "santa-muerte", name: "Santa Muerte", facetLabel: "Color", facetSource: "VARIANT_OPTION", typeFilterVisible: false },
        category: null,
      }),
    );
    expect(list).toEqual([
      { "@type": "ListItem", position: 1, name: "Santa Muerte", item: "https://www.shopcannan.com/collections/santa-muerte" },
      { "@type": "ListItem", position: 2, name: "Santa Muerte Throne Statue" },
    ]);
  });
});
