// lib/checkout/parse-session.ts
//
// Pure functions: Stripe objects in, plain typed data out. No DB, no network.
// This is the one place that knows Stripe's response shapes, so if a future
// API version moves a field, this is the only file that changes.

import type Stripe from "stripe";

import { normalizeEmail } from "@/lib/normalize-email";
import { GUEST_CART_ID_METADATA_KEY, VARIANT_ID_METADATA_KEY } from "./session-params";

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------

export type ParsedLine = {
  variantId: number;
  quantity: number;
  unitPriceCents: number; // what Stripe CHARGED, not what the DB says now
};

// Who checked out: a signed-in user (client_reference_id) or a guest cart
// (metadata), as createCheckoutSession set it.
export type SessionOwner = { kind: "user"; userId: number } | { kind: "guest"; cartId: number };

export type ParsedSession = {
  sessionId: string;
  owner: SessionOwner;
  email: string; // normalized (trim + lowercase)
  shippingAddress: Stripe.Address | null; // stored as Json on Order
  shippingName: string | null;
  paymentIntentId: string | null;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  lines: ParsedLine[];
};

/**
 * Thrown when a PAID session doesn't contain what our code put there
 * (no owner, missing variantId metadata, a null amount).
 * That means a bug or a session we didn't create, never a customer mistake.
 */
export class SessionParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionParseError";
  }
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

/**
 * Converts one Stripe line item (with price.product EXPANDED) into a ParsedLine.
 */
export function parseLineItem(item: Stripe.LineItem): ParsedLine {
  const quantity = item.quantity;
  if (quantity == null) {
    throw new SessionParseError(`Line item ${item.id} has no quantity`);
  }

  const unitPriceCents = item.price?.unit_amount;
  if (unitPriceCents == null) {
    throw new SessionParseError(`Line item ${item.id} has no unit_amount`);
  }

  // Only an expanded, non-deleted Product carries metadata.
  const product = item.price?.product;
  if (typeof product !== "object" || product === null || ("deleted" in product && product.deleted)) {
    throw new SessionParseError(
      `Line item ${item.id} has no expanded product (line items weren't expanded?)`,
    );
  }

  const variantId = Number(product.metadata[VARIANT_ID_METADATA_KEY]);
  if (!isPositiveInteger(variantId)) {
    throw new SessionParseError(`Line item ${item.id} has no valid ${VARIANT_ID_METADATA_KEY} metadata`);
  }

  return { variantId, quantity, unitPriceCents };
}

/**
 * Converts the session + its line items into everything fulfillment needs.
 * Call only for sessions whose payment_status is "paid".
 */
export function parseSession(
  session: Stripe.Checkout.Session,
  lineItems: Stripe.LineItem[],
): ParsedSession {
  const owner = parseOwner(session);

  const rawEmail = session.customer_details?.email ?? session.customer_email;
  if (!rawEmail) {
    throw new SessionParseError(`Session ${session.id} has no customer email`);
  }
  // Guest orders attach to accounts by this value, and User.email is stored
  // normalized, so both sides must match.
  const email = normalizeEmail(rawEmail);

  // On the pinned API version (2026-09-30.endive) the collected address lives
  // under collected_information. Missing shouldn't happen with address
  // collection on, but the order is still valid without it, so don't throw.
  const shipping = session.collected_information?.shipping_details ?? null;

  const paymentIntent = session.payment_intent;
  const paymentIntentId =
    paymentIntent == null ? null : typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;

  const lines = lineItems.map(parseLineItem);
  if (lines.length === 0) {
    throw new SessionParseError(`Session ${session.id} has no line items`);
  }
  // The cart holds each variant once (@@unique([cartId, variantId])), so a
  // repeat means this session didn't come from our checkout action as built.
  if (new Set(lines.map((line) => line.variantId)).size !== lines.length) {
    throw new SessionParseError(`Session ${session.id} has the same variant on more than one line`);
  }

  if (!session.currency) {
    throw new SessionParseError(`Session ${session.id} has no currency`);
  }

  return {
    sessionId: session.id,
    owner,
    email,
    shippingAddress: shipping?.address ?? null,
    shippingName: shipping?.name ?? null,
    paymentIntentId,
    currency: session.currency.toLowerCase(),
    subtotalCents: requireAmount(session.amount_subtotal, "amount_subtotal", session.id),
    shippingCents: requireAmount(session.total_details?.amount_shipping, "amount_shipping", session.id),
    taxCents: requireAmount(session.total_details?.amount_tax, "amount_tax", session.id),
    totalCents: requireAmount(session.amount_total, "amount_total", session.id),
    lines,
  };
}

/**
 * Sanity check: do the line prices add up to Stripe's subtotal?
 * Returns null when consistent, or a short description of the mismatch.
 * A mismatch doesn't block the order (the customer paid amount_total either
 * way); it flags the order for review, because it means our understanding of
 * the charge is off somewhere.
 */
export function checkSubtotal(parsed: ParsedSession): string | null {
  const problems: string[] = [];

  const linesSum = parsed.lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  if (linesSum !== parsed.subtotalCents) {
    problems.push(`line items sum to ${linesSum}, Stripe subtotal is ${parsed.subtotalCents}`);
  }

  const expectedTotal = parsed.subtotalCents + parsed.shippingCents + parsed.taxCents;
  if (expectedTotal !== parsed.totalCents) {
    problems.push(
      `subtotal + shipping + tax is ${expectedTotal}, Stripe total is ${parsed.totalCents}`,
    );
  }

  return problems.length > 0 ? problems.join("; ") : null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// A user session wins if it has a valid client_reference_id; sessions created
// before guest checkout all have one, so they still parse.
function parseOwner(session: Stripe.Checkout.Session): SessionOwner {
  const userId = Number(session.client_reference_id);
  if (isPositiveInteger(userId)) return { kind: "user", userId };

  const cartId = Number(session.metadata?.[GUEST_CART_ID_METADATA_KEY]);
  if (isPositiveInteger(cartId)) return { kind: "guest", cartId };

  throw new SessionParseError(
    `Session ${session.id} has no valid client_reference_id or ${GUEST_CART_ID_METADATA_KEY} metadata`,
  );
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function requireAmount(value: number | null | undefined, field: string, sessionId: string): number {
  if (value == null) {
    throw new SessionParseError(`Session ${sessionId} has no ${field}`);
  }
  return value;
}