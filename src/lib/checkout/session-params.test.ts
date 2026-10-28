import { describe, expect, it } from "vitest";

import type { CartLineView, CartView } from "@/lib/cart/types";
import {
  PRODUCT_TAX_CODE,
  VARIANT_ID_METADATA_KEY,
  buildLineItem,
  buildLineItems,
  buildShippingOptions,
} from "./session-params";

function line(overrides: Partial<CartLineView> = {}): CartLineView {
  return {
    itemId: 1,
    variantId: 7,
    productName: "Virgen de Guadalupe",
    productSlug: "virgen-de-guadalupe",
    productActive: true,
    variantLabel: null,
    imageUrl: null,
    imageAlt: null,
    unitPriceCents: 4800,
    quantity: 2,
    lineTotalCents: 9600,
    stock: 5,
    availability: "ok",
    ...overrides,
  };
}

function cart(lines: CartLineView[]): CartView {
  return {
    cartId: 1,
    lines,
    subtotalCents: lines.reduce((sum, l) => sum + l.lineTotalCents, 0),
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    hasIssues: false,
  };
}

describe("PRODUCT_TAX_CODE", () => {
  it("is General – Tangible Goods", () => {
    expect(PRODUCT_TAX_CODE).toBe("txcd_99999999");
  });
});

describe("buildLineItem", () => {
  it("sets the tax code and keeps the name, metadata, and price", () => {
    expect(buildLineItem(line({ variantLabel: "Size: Large" }))).toEqual({
      quantity: 2,
      price_data: {
        currency: "usd",
        unit_amount: 4800,
        tax_behavior: "exclusive",
        product_data: {
          name: "Virgen de Guadalupe — Size: Large",
          tax_code: "txcd_99999999",
          metadata: { [VARIANT_ID_METADATA_KEY]: "7" },
        },
      },
    });
  });
});

describe("buildLineItems", () => {
  it("gives every line the tax code", () => {
    const items = buildLineItems(cart([line(), line({ itemId: 2, variantId: 8 }), line({ itemId: 3, variantId: 9 })]));
    expect(items).toHaveLength(3);
    expect(items.every((item) => item.price_data?.product_data?.tax_code === PRODUCT_TAX_CODE)).toBe(true);
  });
});

describe("buildShippingOptions", () => {
  it("leaves the free shipping rate on the account's default tax code", () => {
    const [option] = buildShippingOptions(9600);
    expect(option.shipping_rate_data).not.toHaveProperty("tax_code");
  });
});
