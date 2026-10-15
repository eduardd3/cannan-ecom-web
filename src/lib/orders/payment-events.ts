// lib/orders/payment-events.ts
//
// What happens to an order after it's paid, driven by Stripe events the
// webhook receives: refunds (including ones issued from the Stripe Dashboard)
// and disputes. Each handler re-retrieves the object from Stripe instead of
// trusting the event payload, so replays and out-of-order deliveries all
// converge on Stripe's current state.
import "server-only";

import type Stripe from "stripe";

import type { OrderStatus } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { restockDeducted } from "./order-stock";
import { REFUND_TIMEOUT_MS } from "./review";

export type PaymentEventResult =
  // The charge isn't from a checkout (no payment intent): nothing of ours.
  | { status: "ignored" }
  // No order for this payment yet, e.g. the refund arrived before the
  // checkout event was processed. The webhook returns 500 so Stripe retries.
  | { status: "no_order"; paymentIntentId: string }
  | { status: "recorded"; orderId: number; detail: string };

// The order row's lock is held while an admin's review refund calls Stripe
// (up to REFUND_TIMEOUT_MS), so wait out that whole transaction.
const LOCKED_TX_TIMEOUT_MS = REFUND_TIMEOUT_MS + 5_000;

type LockedOrder = { id: number; status: OrderStatus; refundedCents: number };

function paymentIntentIdOf(object: Stripe.Charge | Stripe.Dispute): string | null {
  const pi = object.payment_intent;
  if (!pi) return null;
  return typeof pi === "string" ? pi : pi.id;
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

/**
 * Mirrors a charge's refunds onto its order (charge.refunded).
 *
 * - Always records refundedCents (never lowers it: a stale read can't undo a
 *   newer one).
 * - Full refund of an order that hasn't shipped (PAID, NEEDS_REVIEW): puts
 *   back the units it actually took and marks it REFUNDED.
 * - Full refund of a FULFILLED order: REFUNDED, no stock change. The goods
 *   are gone; if they come back, an admin restocks them.
 * - Partial refund: amount only. Stripe doesn't say which lines it covers.
 *
 * Locks the order row first, the same lock refundReviewedOrder takes, so an
 * admin refund and the webhook it triggers run one after the other; the
 * second finds the order already REFUNDED and only syncs the amount.
 */
export async function recordChargeRefund(chargeId: string): Promise<PaymentEventResult> {
  const charge = await getStripe().charges.retrieve(chargeId);
  const paymentIntentId = paymentIntentIdOf(charge);
  if (!paymentIntentId) return { status: "ignored" };

  return prisma.$transaction(
    async (tx): Promise<PaymentEventResult> => {
      const [order] = await tx.$queryRaw<LockedOrder[]>`
        SELECT "id", "status", "refundedCents" FROM "Order"
        WHERE "stripePaymentIntentId" = ${paymentIntentId} FOR UPDATE`;
      if (!order) return { status: "no_order", paymentIntentId };

      const refundedCents = Math.max(order.refundedCents, charge.amount_refunded);
      const fullyRefunded = charge.refunded;
      const unshipped = order.status === "PAID" || order.status === "NEEDS_REVIEW";

      let restocked = 0;
      if (fullyRefunded && unshipped) {
        restocked = await restockDeducted(tx, order.id, { note: "Refunded in Stripe" });
      }

      const becomesRefunded = fullyRefunded && (unshipped || order.status === "FULFILLED");
      await tx.order.update({
        where: { id: order.id },
        data: {
          refundedCents,
          ...(becomesRefunded && { status: "REFUNDED" }),
          // Refunding settles a review; no admin did it, so no resolver.
          ...(becomesRefunded && order.status === "NEEDS_REVIEW" && { reviewResolvedAt: new Date() }),
        },
      });

      const outcome = becomesRefunded ? `${order.status}→REFUNDED` : fullyRefunded ? "full" : "partial";
      return {
        status: "recorded",
        orderId: order.id,
        detail: `refund ${outcome} refundedCents=${refundedCents} restocked=${restocked}`,
      };
    },
    { timeout: LOCKED_TX_TIMEOUT_MS },
  );
}

// ---------------------------------------------------------------------------
// Disputes
// ---------------------------------------------------------------------------

/**
 * Mirrors a dispute onto its order (charge.dispute.created/updated/closed).
 *
 * - Always records the dispute's id, status, reason, and open date. While
 *   it's open, fulfillOrder refuses to ship the order.
 * - Lost before the order shipped (PAID, NEEDS_REVIEW): the money is gone
 *   but the goods aren't, so the order becomes CANCELED and the units it
 *   took go back to stock.
 * - Lost after shipping, or won: recorded only.
 *
 * A replay or out-of-order delivery is harmless: the dispute is re-retrieved,
 * and a CANCELED order isn't restocked again.
 */
export async function recordDispute(disputeId: string): Promise<PaymentEventResult> {
  const dispute = await getStripe().disputes.retrieve(disputeId);
  const paymentIntentId = paymentIntentIdOf(dispute);
  if (!paymentIntentId) return { status: "ignored" };

  return prisma.$transaction(
    async (tx): Promise<PaymentEventResult> => {
      const [order] = await tx.$queryRaw<LockedOrder[]>`
        SELECT "id", "status", "refundedCents" FROM "Order"
        WHERE "stripePaymentIntentId" = ${paymentIntentId} FOR UPDATE`;
      if (!order) return { status: "no_order", paymentIntentId };

      const lostUnshipped = dispute.status === "lost" && (order.status === "PAID" || order.status === "NEEDS_REVIEW");
      let restocked = 0;
      if (lostUnshipped) {
        restocked = await restockDeducted(tx, order.id, { note: "Dispute lost" });
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          stripeDisputeId: dispute.id,
          disputeStatus: dispute.status,
          disputeReason: dispute.reason,
          disputedAt: new Date(dispute.created * 1000),
          ...(lostUnshipped && { status: "CANCELED" }),
          ...(lostUnshipped && order.status === "NEEDS_REVIEW" && { reviewResolvedAt: new Date() }),
        },
      });

      const outcome = lostUnshipped ? ` ${order.status}→CANCELED` : "";
      return {
        status: "recorded",
        orderId: order.id,
        detail: `dispute ${dispute.id} ${dispute.status}${outcome} restocked=${restocked}`,
      };
    },
    { timeout: LOCKED_TX_TIMEOUT_MS },
  );
}
