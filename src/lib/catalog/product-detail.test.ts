import { describe, expect, it } from "vitest";

import { MAX_QTY_PER_LINE } from "@/lib/cart/schemas";
import {
  addToCartMessage,
  breadcrumbParts,
  clampQuantity,
  galleryImages,
  initialVariant,
  optionGroups,
  productVariantPath,
  quantityOptions,
  reducedQuantityMessage,
  selectOption,
} from "./product-detail";
import type { ProductDetailView, ProductImageView, ProductVariantView } from "./types";

let sequence = 0;
function variant(overrides: Partial<ProductVariantView> = {}): ProductVariantView {
  sequence += 1;
  return {
    id: sequence,
    option1Value: null,
    option2Value: null,
    priceCents: 3000,
    stock: 1,
    dimensions: null,
    ...overrides,
  };
}

const collection: ProductDetailView["collection"] = {
  slug: "signature",
  name: "Signature",
  facetLabel: "Devotion",
  facetSource: "CATEGORY",
  typeFilterVisible: true,
};
const candles = { slug: "candles", name: "Candles" };
const sanJose = { slug: "san-jose", name: "San José" };

describe("productVariantPath", () => {
  it("adds ?variant= only when there is one", () => {
    expect(productVariantPath("rosa", null)).toBe("/products/rosa");
    expect(productVariantPath("rosa", 7)).toBe("/products/rosa?variant=7");
  });
});

describe("breadcrumbParts", () => {
  it("links the category when the collection filters by category", () => {
    expect(breadcrumbParts({ collection, category: sanJose, productType: candles })).toEqual([
      { name: "Signature", href: "/collections/signature" },
      { name: "San José", href: "/collections/signature?facet=san-jose" },
    ]);
  });

  it("falls back to the type when there's no category and the Type filter shows", () => {
    expect(breadcrumbParts({ collection, category: null, productType: candles })).toEqual([
      { name: "Signature", href: "/collections/signature" },
      { name: "Candles", href: "/collections/signature?type=candles" },
    ]);
  });

  it("stops at the collection when the Type filter is hidden", () => {
    const santaMuerte = {
      ...collection,
      slug: "santa-muerte",
      name: "Santa Muerte",
      facetLabel: "Color",
      facetSource: "VARIANT_OPTION" as const,
      typeFilterVisible: false,
    };
    expect(breadcrumbParts({ collection: santaMuerte, category: null, productType: candles })).toEqual([
      { name: "Santa Muerte", href: "/collections/santa-muerte" },
    ]);
  });

  it("doesn't link a category the collection can't filter by", () => {
    const noFacet = { ...collection, facetLabel: null, typeFilterVisible: false };
    expect(breadcrumbParts({ collection: noFacet, category: sanJose, productType: candles })).toHaveLength(1);
  });
});

describe("initialVariant", () => {
  const soldOut = variant({ stock: 0 });
  const inStock = variant({ stock: 3 });
  const other = variant({ stock: 2 });
  const variants = [soldOut, inStock, other];

  it("uses the variant ?variant= names", () => {
    expect(initialVariant(variants, String(other.id))).toBe(other);
    expect(initialVariant(variants, String(soldOut.id))).toBe(soldOut);
    expect(initialVariant(variants, [String(other.id), String(inStock.id)])).toBe(other);
  });

  it("ignores an id that isn't one of these variants", () => {
    expect(initialVariant(variants, "99999")).toBe(inStock);
    expect(initialVariant(variants, `${other.id}abc`)).toBe(inStock);
    expect(initialVariant(variants, undefined)).toBe(inStock);
  });

  it("falls back to the first variant when none has stock", () => {
    const empty = [variant({ stock: 0 }), variant({ stock: 0 })];
    expect(initialVariant(empty, undefined)).toBe(empty[0]);
  });
});

describe("optionGroups", () => {
  const options = { option1Name: "Color", option2Name: "Size" };
  const rojaSmall = variant({ option1Value: "Roja", option2Value: "8 in", stock: 0 });
  const rojaLarge = variant({ option1Value: "Roja", option2Value: "12 in", stock: 2 });
  const blancaSmall = variant({ option1Value: "Blanca", option2Value: "8 in", stock: 0 });
  const negraLarge = variant({ option1Value: "Negra", option2Value: "18 in", stock: 1 });
  const variants = [rojaSmall, rojaLarge, blancaSmall, negraLarge];

  it("lists every option 1 value in variant order, sold out only when all its variants are", () => {
    const [color] = optionGroups({ ...options, variants }, rojaLarge);
    expect(color).toEqual({
      option: 1,
      name: "Color",
      values: [
        { value: "Roja", selected: true, soldOut: false },
        { value: "Blanca", selected: false, soldOut: true },
        { value: "Negra", selected: false, soldOut: false },
      ],
    });
  });

  it("lists only the option 2 values that exist with the selected option 1", () => {
    const [, size] = optionGroups({ ...options, variants }, rojaLarge);
    expect(size).toEqual({
      option: 2,
      name: "Size",
      values: [
        { value: "8 in", selected: false, soldOut: true },
        { value: "12 in", selected: true, soldOut: false },
      ],
    });
  });

  it("has one group for a single option", () => {
    const small = variant({ option1Value: "8 in" });
    const groups = optionGroups({ option1Name: "Size", option2Name: null, variants: [small] }, small);
    expect(groups.map((group) => group.name)).toEqual(["Size"]);
  });

  it("has no groups for a default variant", () => {
    const only = variant();
    expect(optionGroups({ option1Name: null, option2Name: null, variants: [only] }, only)).toEqual([]);
  });
});

describe("selectOption", () => {
  const rojaSmall = variant({ option1Value: "Roja", option2Value: "8 in" });
  const rojaLarge = variant({ option1Value: "Roja", option2Value: "12 in" });
  const blancaSmall = variant({ option1Value: "Blanca", option2Value: "8 in", stock: 0 });
  const blancaLarge = variant({ option1Value: "Blanca", option2Value: "12 in" });
  const negraSmall = variant({ option1Value: "Negra", option2Value: "8 in", stock: 0 });
  const negraHuge = variant({ option1Value: "Negra", option2Value: "18 in", stock: 0 });
  const verdeSmall = variant({ option1Value: "Verde", option2Value: "8 in", stock: 0 });
  const verdeHuge = variant({ option1Value: "Verde", option2Value: "18 in", stock: 4 });
  const variants = [rojaSmall, rojaLarge, blancaSmall, blancaLarge, negraSmall, negraHuge, verdeSmall, verdeHuge];

  it("keeps option 2 when the combination exists, even sold out", () => {
    expect(selectOption(variants, rojaSmall, 1, "Blanca")).toBe(blancaSmall);
  });

  it("otherwise picks the first option 2 in stock", () => {
    expect(selectOption(variants, rojaLarge, 1, "Verde")).toBe(verdeHuge);
  });

  it("otherwise picks the first option 2", () => {
    expect(selectOption(variants, rojaLarge, 1, "Negra")).toBe(negraSmall);
  });

  it("changes option 2 within the selected option 1", () => {
    expect(selectOption(variants, rojaSmall, 2, "12 in")).toBe(rojaLarge);
  });

  it("leaves the selection alone for a value that doesn't exist", () => {
    expect(selectOption(variants, rojaSmall, 1, "Azul")).toBe(rojaSmall);
    expect(selectOption(variants, rojaSmall, 2, "18 in")).toBe(rojaSmall);
  });
});

describe("galleryImages", () => {
  const image = (url: string, variantId: number | null): ProductImageView => ({ url, alt: "", variantId });

  it("puts the variant's own images first, then the shared ones, and leaves out the rest", () => {
    const images = [image("shared-1", null), image("red", 1), image("white", 2), image("shared-2", null), image("red-2", 1)];
    expect(galleryImages(images, 1).map((i) => i.url)).toEqual(["red", "red-2", "shared-1", "shared-2"]);
  });
});

describe("quantityOptions", () => {
  it("runs from 1 to the stock", () => {
    expect(quantityOptions(3)).toEqual([1, 2, 3]);
  });

  it("stops at the per-line limit", () => {
    expect(quantityOptions(50)).toHaveLength(MAX_QTY_PER_LINE);
  });

  it("is empty when sold out", () => {
    expect(quantityOptions(0)).toEqual([]);
  });
});

describe("clampQuantity", () => {
  it("lowers the quantity to the new variant's stock", () => {
    expect(clampQuantity(5, 2)).toBe(2);
  });

  it("keeps a quantity that fits", () => {
    expect(clampQuantity(2, 5)).toBe(2);
  });

  it("stops at the per-line limit and never goes below 1", () => {
    expect(clampQuantity(50, 50)).toBe(MAX_QTY_PER_LINE);
    expect(clampQuantity(3, 0)).toBe(1);
  });
});

describe("reducedQuantityMessage", () => {
  it("reads correctly in the singular and the plural", () => {
    expect(reducedQuantityMessage(1)).toBe("Your cart now has 1 of this piece, the most you can add.");
    expect(reducedQuantityMessage(3)).toBe("Your cart now has 3 of these, the most you can add.");
  });
});

describe("addToCartMessage", () => {
  it("confirms an add with a View cart link", () => {
    expect(addToCartMessage({ ok: true, data: { quantity: 2 } })).toEqual({
      text: "Added to your cart.",
      tone: "notice",
      viewCart: true,
    });
  });

  it("states the new total when the quantity was capped", () => {
    expect(addToCartMessage({ ok: true, data: { quantity: 4 }, notice: "capped" })).toEqual({
      text: "Your cart now has 4 of these, the most you can add.",
      tone: "notice",
      viewCart: true,
    });
  });

  it("words each failure as an error without a link", () => {
    const fail = (error: "OUT_OF_STOCK" | "VARIANT_NOT_FOUND" | "UNAUTHENTICATED" | "INVALID_INPUT" | "UNKNOWN") =>
      addToCartMessage({ ok: false, error, message: "" });
    expect(fail("OUT_OF_STOCK").text).toBe("This piece just sold out.");
    expect(fail("VARIANT_NOT_FOUND").text).toBe("This piece is no longer available.");
    expect(fail("UNAUTHENTICATED").text).toBe("Your session ended. Sign in again to add this to your cart.");
    expect(fail("INVALID_INPUT").text).toBe("We couldn't add this to your cart. Please try again.");
    expect(fail("UNKNOWN")).toEqual({
      text: "We couldn't add this to your cart. Please try again.",
      tone: "error",
      viewCart: false,
    });
  });

  it("treats a failed call as an error", () => {
    expect(addToCartMessage(null).tone).toBe("error");
  });
});
