// app/api/webhooks/stripe/route.ts
//
// Stripe → our server. The ONLY trustworthy signal that a payment happened.
// A route handler, not a server action: Stripe needs a fixed URL, and
// signature verification needs the exact raw bytes of the request body.
import type Stripe from "stripe";

import { fulfillCheckout } from "@/lib/checkout/fulfill";
import { sendOrderConfirmation } from "@/lib/orders/confirmation";
import { recordChargeRefund, recordDispute, type PaymentEventResult } from "@/lib/orders/payment-events";
import { getStripe, getWebhookSecret } from "@/lib/stripe";

// Prisma needs the Node.js runtime (not Edge). Being explicit means a future
// config change can't silently move this route somewhere it can't run.
export const runtime = "nodejs";

// The events this endpoint acts on. Everything else gets a 200 and is ignored.
const FULFILLMENT_EVENTS = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

// After payment: each maps a Stripe object id to its handler.
const PAYMENT_EVENT_HANDLERS: Partial<Record<Stripe.Event.Type, (id: string) => Promise<PaymentEventResult>>> = {
  "charge.refunded": recordChargeRefund,
  "charge.dispute.created": recordDispute,
  "charge.dispute.updated": recordDispute,
  "charge.dispute.closed": recordDispute,
};

// Small plain bodies: Stripe only reads the status code, and nothing here
// should reveal internals.
function reply(status: number, body: string): Response {
  return new Response(body, { status });
}

export async function POST(request: Request): Promise<Response> {
  // 1. Verify the request really came from Stripe.
  const signature = request.headers.get("stripe-signature");
  if (!signature) return reply(400, "Missing signature");

  // Raw text, not request.json(): the signature covers the exact bytes.
  const body = await request.text();

  // Config errors are ours, not the sender's: 500 so Stripe retries once
  // the env var is fixed, instead of a 400 that reads as a forged request.
  let secret: string;
  try {
    secret = getWebhookSecret();
  } catch (err) {
    console.error("Stripe webhook misconfigured", err instanceof Error ? err.message : err);
    return reply(500, "Server error");
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature check failed", err instanceof Error ? err.message : err);
    return reply(400, "Invalid signature");
  }

  // 2. Route the event. async_payment_failed and expired have nothing to
  //    create; the failed one is logged so a bounced delayed payment shows up.
  const paymentHandler = PAYMENT_EVENT_HANDLERS[event.type];
  if (paymentHandler) return handlePaymentEvent(event, paymentHandler);
  if (!FULFILLMENT_EVENTS.has(event.type)) {
    if (event.type === "checkout.session.async_payment_failed") {
      console.warn("Stripe async payment failed", event.id, event.data.object.id);
    }
    return reply(200, "ignored");
  }

  // Only session.id is read from the payload. fulfillCheckout re-retrieves the
  // session at our pinned API version, so the event's payload shape (which
  // follows the endpoint's API version) doesn't matter.
  const session = event.data.object as Stripe.Checkout.Session;

  // 3. Fulfill. All three results are a 200: created, already_fulfilled (a
  //    retry or duplicate delivery), and not_paid (wait for the next event).
  try {
    const result = await fulfillCheckout(session.id);
    const detail =
      result.status === "created"
        ? ` order=${result.orderId} needsReview=${result.needsReview}`
        : result.status === "already_fulfilled"
          ? ` order=${result.orderId}`
          : "";
    console.info(`Stripe webhook ${event.id} ${event.type}: ${result.status}${detail}`);

    // 4. Confirmation email, after the order is committed. Also tried on
    //    already_fulfilled, so a redelivery covers a send that never happened.
    //    It only sends for PAID orders (review orders wait for approval) and
    //    never throws: a failed email is logged, not retried through Stripe.
    if (result.status !== "not_paid") await sendOrderConfirmation(result.orderId);
    return reply(200, "ok");
  } catch (err) {
    // No customer data in the log: ids, type, and the error only.
    console.error(
      `Stripe webhook ${event.id} ${event.type} failed for session ${session.id}`,
      err instanceof Error ? (err.stack ?? err.message) : err,
    );
    return reply(500, "Server error"); // Stripe retries this event later
  }
}

// Refunds and disputes. Only the object's id is read from the payload; the
// handler re-retrieves it from Stripe.
async function handlePaymentEvent(
  event: Stripe.Event,
  handler: (id: string) => Promise<PaymentEventResult>,
): Promise<Response> {
  const objectId = (event.data.object as { id: string }).id;
  try {
    const result = await handler(objectId);
    if (result.status === "no_order") {
      // Usually the checkout event hasn't been processed yet. 500 so Stripe
      // retries (for up to 3 days) until the order exists.
      console.warn(`Stripe webhook ${event.id} ${event.type}: no order for ${result.paymentIntentId}, will retry`);
      return reply(500, "Order not found");
    }
    const detail = result.status === "recorded" ? ` order=${result.orderId} ${result.detail}` : "";
    console.info(`Stripe webhook ${event.id} ${event.type}: ${result.status}${detail}`);
    return reply(200, "ok");
  } catch (err) {
    console.error(
      `Stripe webhook ${event.id} ${event.type} failed for ${objectId}`,
      err instanceof Error ? (err.stack ?? err.message) : err,
    );
    return reply(500, "Server error"); // Stripe retries this event later
  }
}
