// Builds the Stripe objects fulfillCheckout reads, for a mocked getStripe().
import type Stripe from "stripe";

export type CheckoutLine = { variantId: number; quantity: number; unitPriceCents: number };

let sequence = 0;

export function fakeCheckout(
  userId: number,
  lines: CheckoutLine[],
  options: { paymentStatus?: "paid" | "unpaid"; subtotalAdjustCents?: number } = {},
) {
  sequence += 1;
  const subtotal = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const reportedSubtotal = subtotal + (options.subtotalAdjustCents ?? 0);

  const session = {
    id: `cs_test_${sequence}`,
    payment_status: options.paymentStatus ?? "paid",
    client_reference_id: String(userId),
    customer_details: { email: "buyer@example.com" },
    customer_email: null,
    collected_information: {
      shipping_details: {
        name: "Ana Buyer",
        address: { line1: "1 Main St", city: "Los Angeles", state: "CA", postal_code: "90001", country: "US" },
      },
    },
    payment_intent: `pi_test_${sequence}`,
    currency: "usd",
    amount_subtotal: reportedSubtotal,
    amount_total: reportedSubtotal + 500,
    total_details: { amount_shipping: 500, amount_tax: 0 },
  } as unknown as Stripe.Checkout.Session;

  const lineItems = lines.map(
    (line, index) =>
      ({
        id: `li_${sequence}_${index}`,
        quantity: line.quantity,
        price: {
          unit_amount: line.unitPriceCents,
          product: { id: `prod_${line.variantId}`, metadata: { variantId: String(line.variantId) } },
        },
      }) as unknown as Stripe.LineItem,
  );

  return { session, lineItems };
}
