import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { checkSubtotal, parseLineItem, parseSession, SessionParseError } from "./parse-session";

// Only the fields parse-session reads; the casts keep fixtures readable.
function lineItem(overrides: { variantId?: string; quantity?: number | null; unitAmount?: number | null } = {}) {
  return {
    id: "li_1",
    quantity: overrides.quantity === undefined ? 2 : overrides.quantity,
    price: {
      unit_amount: overrides.unitAmount === undefined ? 1500 : overrides.unitAmount,
      product: { id: "prod_1", metadata: { variantId: overrides.variantId ?? "7" } },
    },
  } as unknown as Stripe.LineItem;
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_test_1",
    client_reference_id: "42",
    customer_details: { email: "buyer@example.com" },
    customer_email: null,
    collected_information: {
      shipping_details: {
        name: "Ana Buyer",
        address: { line1: "1 Main St", city: "Los Angeles", state: "CA", postal_code: "90001", country: "US" },
      },
    },
    payment_intent: "pi_1",
    currency: "USD",
    amount_subtotal: 3000,
    amount_total: 3800,
    total_details: { amount_shipping: 500, amount_tax: 300 },
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

describe("parseLineItem", () => {
  it("reads variantId, quantity, and the charged unit price", () => {
    expect(parseLineItem(lineItem())).toEqual({ variantId: 7, quantity: 2, unitPriceCents: 1500 });
  });

  it("throws on a missing quantity or unit amount", () => {
    expect(() => parseLineItem(lineItem({ quantity: null }))).toThrow(SessionParseError);
    expect(() => parseLineItem(lineItem({ unitAmount: null }))).toThrow(SessionParseError);
  });

  it("throws when the product wasn't expanded", () => {
    const item = { ...lineItem(), price: { unit_amount: 1500, product: "prod_1" } } as unknown as Stripe.LineItem;
    expect(() => parseLineItem(item)).toThrow(/expanded product/);
  });

  it("throws on missing or invalid variantId metadata", () => {
    expect(() => parseLineItem(lineItem({ variantId: "" }))).toThrow(/variantId/);
    expect(() => parseLineItem(lineItem({ variantId: "abc" }))).toThrow(/variantId/);
    expect(() => parseLineItem(lineItem({ variantId: "-3" }))).toThrow(/variantId/);
  });
});

describe("parseSession", () => {
  it("parses a complete session", () => {
    expect(parseSession(session(), [lineItem()])).toEqual({
      sessionId: "cs_test_1",
      userId: 42,
      email: "buyer@example.com",
      shippingAddress: { line1: "1 Main St", city: "Los Angeles", state: "CA", postal_code: "90001", country: "US" },
      shippingName: "Ana Buyer",
      paymentIntentId: "pi_1",
      currency: "usd",
      subtotalCents: 3000,
      shippingCents: 500,
      taxCents: 300,
      totalCents: 3800,
      lines: [{ variantId: 7, quantity: 2, unitPriceCents: 1500 }],
    });
  });

  it("takes the id from an expanded payment intent", () => {
    const parsed = parseSession(session({ payment_intent: { id: "pi_expanded" } }), [lineItem()]);
    expect(parsed.paymentIntentId).toBe("pi_expanded");
  });

  it("falls back to customer_email and allows a missing address", () => {
    const parsed = parseSession(
      session({ customer_details: null, customer_email: "fallback@example.com", collected_information: null }),
      [lineItem()],
    );
    expect(parsed.email).toBe("fallback@example.com");
    expect(parsed.shippingAddress).toBeNull();
    expect(parsed.shippingName).toBeNull();
  });

  it("throws on a missing or invalid user id", () => {
    expect(() => parseSession(session({ client_reference_id: null }), [lineItem()])).toThrow(/client_reference_id/);
    expect(() => parseSession(session({ client_reference_id: "0" }), [lineItem()])).toThrow(/client_reference_id/);
  });

  it("throws on a missing email, currency, or amount", () => {
    expect(() => parseSession(session({ customer_details: null }), [lineItem()])).toThrow(/email/);
    expect(() => parseSession(session({ currency: null }), [lineItem()])).toThrow(/currency/);
    expect(() => parseSession(session({ amount_total: null }), [lineItem()])).toThrow(/amount_total/);
    expect(() => parseSession(session({ total_details: null }), [lineItem()])).toThrow(/amount_shipping/);
  });

  it("throws on no line items or a repeated variant", () => {
    expect(() => parseSession(session(), [])).toThrow(/no line items/);
    expect(() => parseSession(session(), [lineItem(), lineItem()])).toThrow(/more than one line/);
  });
});

describe("checkSubtotal", () => {
  it("returns null when lines, subtotal, and total agree", () => {
    expect(checkSubtotal(parseSession(session(), [lineItem()]))).toBeNull();
  });

  it("reports a line sum that differs from Stripe's subtotal", () => {
    const parsed = parseSession(session({ amount_subtotal: 2900, amount_total: 3700 }), [lineItem()]);
    expect(checkSubtotal(parsed)).toBe("line items sum to 3000, Stripe subtotal is 2900");
  });

  it("reports a total that isn't subtotal + shipping + tax", () => {
    const parsed = parseSession(session({ amount_total: 4000 }), [lineItem()]);
    expect(checkSubtotal(parsed)).toBe("subtotal + shipping + tax is 3800, Stripe total is 4000");
  });
});
