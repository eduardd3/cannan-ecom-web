// lib/orders/review.ts
//
// The two ways out of NEEDS_REVIEW. Server actions in ./actions call these
// after requireStaff(); keeping them here (not in a "use server" file) means
// they aren't public endpoints and can be tested against a real database.
import "server-only";

import Stripe from "stripe";

import { Prisma, type OrderStatus } from "@/generated/prisma/client";

import { adjustStock } from "@/lib/inventory/adjust";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { orderLines, restockDeducted } from "./order-stock";

export type ReviewErrorCode =
  | "NOT_FOUND"
  | "NOT_IN_REVIEW"
  | "INSUFFICIENT_STOCK"
  | "NO_PAYMENT_INTENT"
  | "STRIPE_ERROR";

export type ReviewResult = { ok: true } | { ok: false; error: ReviewErrorCode; message: string };

// Thrown inside a transaction to roll it back while still returning a result.
class Rollback extends Error {
  constructor(readonly result: Extract<ReviewResult, { ok: false }>) {
    super(result.message);
  }
}

function fail(error: ReviewErrorCode, message: string): Extract<ReviewResult, { ok: false }> {
  return { ok: false, error, message };
}

function notInReview(status: OrderStatus) {
  return fail("NOT_IN_REVIEW", `This order is ${status}, not in review. It may have just been resolved.`);
}

async function runReview(fn: (tx: Prisma.TransactionClient) => Promise<ReviewResult>, timeout?: number) {
  try {
    return await prisma.$transaction(fn, timeout ? { timeout } : undefined);
  } catch (err) {
    if (err instanceof Rollback) return err.result;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Approve
// ---------------------------------------------------------------------------

/**
 * NEEDS_REVIEW → PAID. Takes stock for every line the webhook couldn't
 * deduct (ORDER_PLACED for the outstanding units), all or nothing: if any
 * line is still short, nothing changes and the admin is told to restock.
 */
export async function approveReviewedOrder(orderId: number, adminId: number): Promise<ReviewResult> {
  return runReview(async (tx) => {
    // The status change goes first: the guarded update row-locks the order,
    // so a concurrent approve or refund waits here and then matches nothing.
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: "NEEDS_REVIEW" },
      data: { status: "PAID", reviewResolvedAt: new Date(), reviewResolvedById: adminId },
    });
    if (count === 0) {
      const order = await tx.order.findUnique({ where: { id: orderId }, select: { status: true } });
      return order ? notInReview(order.status) : fail("NOT_FOUND", "Order not found.");
    }

    const shortfalls: string[] = [];
    for (const line of await orderLines(tx, orderId)) {
      if (line.outstanding === 0) continue;
      const result = await adjustStock(tx, {
        variantId: line.variantId,
        delta: -line.outstanding,
        reason: "ORDER_PLACED",
        orderId,
        createdById: adminId,
        note: "Approved from review",
      });
      if (result.ok) continue;
      if (result.reason === "VARIANT_NOT_FOUND") {
        throw new Error(`Variant ${line.variantId} on order ${orderId} not found`);
      }
      shortfalls.push(`${line.sku}: needs ${line.outstanding}, ${result.available} in stock`);
    }

    if (shortfalls.length > 0) {
      throw new Rollback(fail("INSUFFICIENT_STOCK", `Restock before approving. ${shortfalls.join("; ")}.`));
    }
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Refund
// ---------------------------------------------------------------------------

// Long enough for a Stripe refund call made while the transaction is open.
export const REFUND_TIMEOUT_MS = 20_000;

/**
 * NEEDS_REVIEW → REFUNDED. Refunds the full payment in Stripe, then puts back
 * (ORDER_CANCELED) the units this order actually took. Nothing shipped while
 * the order was in review, so those units are still on the shelf.
 *
 * The order row stays locked for the Stripe call, so an approve can't land
 * between the refund and the status change. The idempotency key makes a
 * retry after a failed commit return the same refund instead of a second one.
 */
export async function refundReviewedOrder(orderId: number, adminId: number): Promise<ReviewResult> {
  return runReview(async (tx) => {
    const [order] = await tx.$queryRaw<{ status: OrderStatus; stripePaymentIntentId: string | null }[]>`
      SELECT "status", "stripePaymentIntentId" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
    if (!order) return fail("NOT_FOUND", "Order not found.");
    if (order.status !== "NEEDS_REVIEW") return notInReview(order.status);
    if (!order.stripePaymentIntentId) {
      return fail("NO_PAYMENT_INTENT", "This order has no Stripe payment to refund. Check it in the Stripe Dashboard.");
    }

    // What this call refunded: the rest of the charge, after any earlier
    // partial refund. Stays 0 if Stripe had already refunded it all, whose
    // charge.refunded event records the amount instead.
    let refundedNow = 0;
    try {
      const refund = await getStripe().refunds.create(
        { payment_intent: order.stripePaymentIntentId, metadata: { orderId: String(orderId) } },
        { idempotencyKey: `order-${orderId}-refund` },
      );
      refundedNow = refund.amount;
    } catch (err) {
      // Already refunded (e.g. from the Dashboard): the money is back with the
      // customer either way, so finish recording it here.
      const alreadyRefunded = err instanceof Stripe.errors.StripeError && err.code === "charge_already_refunded";
      if (!alreadyRefunded) {
        console.error(`Refund for order ${orderId} failed`, err instanceof Error ? err.message : err);
        const detail = err instanceof Stripe.errors.StripeError ? ` Stripe said: ${err.message}` : "";
        return fail("STRIPE_ERROR", `The refund didn't go through, so nothing changed.${detail}`);
      }
    }

    await restockDeducted(tx, orderId, { createdById: adminId, note: "Refunded from review" });

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "REFUNDED",
        refundedCents: { increment: refundedNow },
        reviewResolvedAt: new Date(),
        reviewResolvedById: adminId,
      },
    });
    return { ok: true };
  }, REFUND_TIMEOUT_MS);
}
