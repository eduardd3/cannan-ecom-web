// lib/orders/fulfillment.ts
//
// Marking an order shipped. The server action in ./actions calls this after
// requireStaff(); kept out of the "use server" file so it isn't a public
// endpoint and can be tested against a real database.
import "server-only";

import type { Carrier } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { CLOSED_DISPUTE_STATUSES, isDisputeOpen } from "./dispute";
import { ORDER_STATUS_LABEL } from "./format";

export type FulfillErrorCode = "NOT_FOUND" | "NOT_PAID" | "NOT_FULFILLED" | "DISPUTED";

export type FulfillResult = { ok: true } | { ok: false; error: FulfillErrorCode; message: string };

// Shipping a PAID order, or correcting the shipment on a FULFILLED one.
export type FulfillInput = {
  orderId: number;
  carrier: Carrier;
  trackingNumber: string; // already normalized
  adminId: number;
};

/**
 * PAID → FULFILLED with the shipment's carrier and tracking number.
 *
 * Only PAID orders ship: a NEEDS_REVIEW order hasn't taken all its stock, and
 * the rest are finished. An order with an open dispute doesn't ship either:
 * the customer's bank is already taking the money back. The guards in the
 * WHERE make this a single conditional write, so two admins submitting at
 * once (or a dispute landing mid-submit) can't both succeed.
 */
export async function fulfillOrder(input: FulfillInput): Promise<FulfillResult> {
  const { count } = await prisma.order.updateMany({
    where: {
      id: input.orderId,
      status: "PAID",
      OR: [{ disputeStatus: null }, { disputeStatus: { in: [...CLOSED_DISPUTE_STATUSES] } }],
    },
    data: {
      status: "FULFILLED",
      carrier: input.carrier,
      trackingNumber: input.trackingNumber,
      fulfilledAt: new Date(),
      fulfilledById: input.adminId,
    },
  });
  if (count === 1) return { ok: true };

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { status: true, disputeStatus: true },
  });
  if (!order) return { ok: false, error: "NOT_FOUND", message: "Order not found." };
  if (order.status === "PAID" && isDisputeOpen(order.disputeStatus)) {
    return {
      ok: false,
      error: "DISPUTED",
      message: "This order has an open dispute. Don't ship it until the dispute is resolved in Stripe.",
    };
  }
  return {
    ok: false,
    error: "NOT_PAID",
    message:
      order.status === "NEEDS_REVIEW"
        ? "Resolve the review before shipping this order."
        : `This order is ${ORDER_STATUS_LABEL[order.status].toLowerCase()}, so it can't be marked shipped. It may have just been updated.`,
  };
}

/**
 * Corrects the carrier or tracking number on a FULFILLED order and records
 * who did it. fulfilledAt stays the original ship date.
 *
 * Saving the same values is a no-op that still succeeds, so it doesn't stamp
 * an edit that changed nothing.
 */
export async function updateTracking(input: FulfillInput): Promise<FulfillResult> {
  const { count } = await prisma.order.updateMany({
    where: {
      id: input.orderId,
      status: "FULFILLED",
      OR: [{ carrier: { not: input.carrier } }, { trackingNumber: { not: input.trackingNumber } }],
    },
    data: {
      carrier: input.carrier,
      trackingNumber: input.trackingNumber,
      trackingUpdatedAt: new Date(),
      trackingUpdatedById: input.adminId,
    },
  });
  if (count === 1) return { ok: true };

  const order = await prisma.order.findUnique({ where: { id: input.orderId }, select: { status: true } });
  if (!order) return { ok: false, error: "NOT_FOUND", message: "Order not found." };
  if (order.status === "FULFILLED") return { ok: true }; // nothing changed
  return {
    ok: false,
    error: "NOT_FULFILLED",
    message: `This order is ${ORDER_STATUS_LABEL[order.status].toLowerCase()}, so its tracking can't be edited. It may have just been updated.`,
  };
}
