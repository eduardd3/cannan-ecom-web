// lib/checkout/session-params.ts
//
// Pure functions: CartView in, Stripe params out. No database, no network.
// Keeping the "what do we send Stripe" logic here makes it unit-testable and
// keeps the server action short and readable.

import type Stripe from "stripe";

import type { CartLineView, CartView } from "@/lib/cart/types";

type LineItem = Stripe.Checkout.SessionCreateParams.LineItem;
type ShippingOption = Stripe.Checkout.SessionCreateParams.ShippingOption;

// The metadata key the webhook reads back to know which variant a line was.
// Exported so fulfill.ts uses the SAME constant: a typo on either side
// would silently break order creation.
export const VARIANT_ID_METADATA_KEY = "variantId";

/**
 * One Stripe line item per cart line, priced from the CartView (which was
 * read fresh from ProductVariant, never from anything the client sent).
 */
export function buildLineItem(line: CartLineView): LineItem {
  return {
    quantity: line.quantity,
    price_data: {
      currency: "usd",
      unit_amount: line.unitPriceCents,
      tax_behavior: "exclusive",
      product_data: {
        // What the customer sees on the payment page, e.g. "Tote — Size: Large"
        name: line.variantLabel ? `${line.productName} — ${line.variantLabel}` : line.productName,
        metadata: {
          [VARIANT_ID_METADATA_KEY]: String(line.variantId),
        },
      },
    },
  };
}

/**
 * Maps every line. The caller must already have rejected a cart with
 * hasIssues, so each line here is purchasable at its full quantity.
 */
export function buildLineItems(cart: CartView): LineItem[] {
  return cart.lines.map(buildLineItem);
}

/**
 * Shipping choices shown on the payment page. Today: one free option.
 * Takes the subtotal anyway, so a future "free over $X, else flat rate"
 * rule changes only this function.
 */
export function buildShippingOptions(subtotalCents: number): ShippingOption[] {
  return [
    {
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: { amount: 0, currency: "usd" },
        display_name: "Free shipping",
        tax_behavior: "exclusive",
        delivery_estimate: {
          maximum: { unit: "business_day", value: 3 },
        },
      },
    },
  ];
}

/**
 * Where Stripe sends the customer after paying. {CHECKOUT_SESSION_ID} is a
 * literal placeholder Stripe fills in, so it must NOT be URL-encoded (and is
 * not a template-literal ${...} interpolation).
 *
 * Lives under /id/checkout so the proxy's sign-in gate covers it too.
 */
export function buildReturnUrl(siteUrl: string): string {
  return `${siteUrl}/id/checkout/return?session_id={CHECKOUT_SESSION_ID}`;
}