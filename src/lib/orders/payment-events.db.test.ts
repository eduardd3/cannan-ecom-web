import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { fulfillCheckout } from "@/lib/checkout/fulfill";
import { checkStockConsistency } from "@/lib/inventory/adjust";
import { prisma } from "@/lib/prisma";
import { createUser, createVariant, resetDb, stockOf } from "../../../test/db";
import { fakeCheckout, type CheckoutLine } from "../../../test/stripe-checkout";
import { fulfillOrder } from "./fulfillment";
import { recordChargeRefund, recordDispute } from "./payment-events";
import { refundReviewedOrder } from "./review";

const stripe = vi.hoisted(() => ({
  checkout: { sessions: { retrieve: vi.fn(), listLineItems: vi.fn() } },
  refunds: { create: vi.fn() },
  charges: { retrieve: vi.fn() },
  disputes: { retrieve: vi.fn() },
}));
vi.mock("@/lib/stripe", () => ({ getStripe: () => stripe }));

async function placeOrder(userId: number, lines: CheckoutLine[]) {
  const { session, lineItems } = fakeCheckout(userId, lines);
  stripe.checkout.sessions.retrieve.mockResolvedValue(session);
  stripe.checkout.sessions.listLineItems.mockResolvedValue({ data: lineItems, has_more: false });
  const result = await fulfillCheckout(session.id);
  if (result.status !== "created") throw new Error(`placeOrder: ${result.status}`);
  return prisma.order.findUniqueOrThrow({ where: { id: result.orderId } });
}

type OrderRow = Awaited<ReturnType<typeof placeOrder>>;

/** What charges.retrieve returns next: the order's charge with `refundedCents` refunded so far. */
function chargeFor(order: OrderRow, refundedCents: number) {
  const amount = order.subtotalCents + order.shippingCents + order.taxCents;
  const charge = {
    id: `ch_for_${order.id}`,
    payment_intent: order.stripePaymentIntentId,
    amount,
    amount_refunded: refundedCents,
    refunded: refundedCents === amount,
  };
  stripe.charges.retrieve.mockResolvedValue(charge);
  return charge;
}

/** What disputes.retrieve returns next: a dispute on the order's payment, in `status`. */
function disputeFor(order: OrderRow, status: string) {
  const dispute = {
    id: `dp_for_${order.id}`,
    payment_intent: order.stripePaymentIntentId,
    status,
    reason: "product_not_received",
    created: 1_791_000_000,
  };
  stripe.disputes.retrieve.mockResolvedValue(dispute);
  return dispute;
}

const ship = (orderId: number, adminId: number) =>
  fulfillOrder({ orderId, carrier: "USPS", trackingNumber: "9400100000000000000000", adminId });

const totalOf = (order: OrderRow) => order.subtotalCents + order.shippingCents + order.taxCents;

async function ledger(orderId: number) {
  return prisma.inventoryAdjustment.findMany({
    where: { orderId },
    orderBy: { id: "asc" },
    select: { variantId: true, delta: true, reason: true, createdById: true },
  });
}

const reload = (orderId: number) => prisma.order.findUniqueOrThrow({ where: { id: orderId } });

beforeEach(async () => {
  vi.clearAllMocks();
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("recordChargeRefund", () => {
  it("full refund of an unshipped order puts its units back and marks it REFUNDED", async () => {
    const customer = await createUser();
    const variant = await createVariant({ stock: 5 });
    const order = await placeOrder(customer.id, [{ variantId: variant.id, quantity: 2, unitPriceCents: 1500 }]);
    const charge = chargeFor(order, totalOf(order));

    const result = await recordChargeRefund(charge.id);

    expect(result).toMatchObject({ status: "recorded", orderId: order.id });
    const after = await reload(order.id);
    expect(after.status).toBe("REFUNDED");
    expect(after.refundedCents).toBe(totalOf(order));
    expect(await ledger(order.id)).toEqual([
      { variantId: variant.id, delta: -2, reason: "ORDER_PLACED", createdById: null },
      { variantId: variant.id, delta: 2, reason: "ORDER_CANCELED", createdById: null },
    ]);
    expect(await stockOf(variant.id)).toBe(5);
    expect((await checkStockConsistency(variant.id))?.consistent).toBe(true);
  });

  it("full refund of an order in review puts back only the lines that were deducted", async () => {
    const customer = await createUser();
    const plenty = await createVariant({ stock: 5 });
    const short = await createVariant({ stock: 1 });
    const order = await placeOrder(customer.id, [
      { variantId: plenty.id, quantity: 2, unitPriceCents: 1500 },
      { variantId: short.id, quantity: 3, unitPriceCents: 1500 },
    ]);
    expect(order.status).toBe("NEEDS_REVIEW");
    const charge = chargeFor(order, totalOf(order));

    await recordChargeRefund(charge.id);

    const after = await reload(order.id);
    expect(after.status).toBe("REFUNDED");
    expect(after.reviewResolvedAt).toBeInstanceOf(Date);
    expect(after.reviewResolvedById).toBeNull(); // settled in Stripe, not by an admin here
    expect(await stockOf(plenty.id)).toBe(5);
    expect(await stockOf(short.id)).toBe(1); // never taken, so never put back
    expect((await ledger(order.id)).filter((row) => row.variantId === short.id)).toEqual([]);
  });

  it("full refund of a shipped order marks it REFUNDED without touching stock", async () => {
    const [customer, admin] = await Promise.all([createUser(), createUser("ADMIN")]);
    const variant = await createVariant({ stock: 5 });
    const order = await placeOrder(customer.id, [{ variantId: variant.id, quantity: 2, unitPriceCents: 1500 }]);
    expect(
      await fulfillOrder({ orderId: order.id, carrier: "USPS", trackingNumber: "9400100000000000000000", adminId: admin.id }),
    ).toEqual({ ok: true });
    const charge = chargeFor(order, totalOf(order));

    await recordChargeRefund(charge.id);

    const after = await reload(order.id);
    expect(after.status).toBe("REFUNDED");
    expect(after.trackingNumber).toBe("9400100000000000000000"); // kept as history
    expect(await stockOf(variant.id)).toBe(3);
    expect((await ledger(order.id)).map((row) => row.reason)).toEqual(["ORDER_PLACED"]);
  });

  it("partial refund records the amount only; a later full refund then restocks", async () => {
    const customer = await createUser();
    const variant = await createVariant({ stock: 5 });
    const order = await placeOrder(customer.id, [{ variantId: variant.id, quantity: 2, unitPriceCents: 1500 }]);

    await recordChargeRefund(chargeFor(order, 500).id);
    let after = await reload(order.id);
    expect(after.status).toBe("PAID");
    expect(after.refundedCents).toBe(500);
    expect(await stockOf(variant.id)).toBe(3);

    await recordChargeRefund(chargeFor(order, totalOf(order)).id);
    after = await reload(order.id);
    expect(after.status).toBe("REFUNDED");
    expect(after.refundedCents).toBe(totalOf(order));
    expect(await stockOf(variant.id)).toBe(5);
  });

  it("is idempotent: a replayed event writes no second restock", async () => {
    const customer = await createUser();
    const variant = await createVariant({ stock: 5 });
    const order = await placeOrder(customer.id, [{ variantId: variant.id, quantity: 2, unitPriceCents: 1500 }]);
    const charge = chargeFor(order, totalOf(order));

    await recordChargeRefund(charge.id);
    await recordChargeRefund(charge.id);

    expect((await ledger(order.id)).map((row) => row.reason)).toEqual(["ORDER_PLACED", "ORDER_CANCELED"]);
    expect(await stockOf(variant.id)).toBe(5);
  });

  it("never lowers refundedCents when a stale charge is read after a newer one", async () => {
    const customer = await createUser();
    const variant = await createVariant({ stock: 5 });
    const order = await placeOrder(customer.id, [{ variantId: variant.id, quantity: 1, unitPriceCents: 1500 }]);

    await recordChargeRefund(chargeFor(order, 900).id);
    await recordChargeRefund(chargeFor(order, 400).id);

    expect((await reload(order.id)).refundedCents).toBe(900);
  });

  it("after an admin refunds from review, the resulting event changes nothing but the amount", async () => {
    const [customer, admin] = await Promise.all([createUser(), createUser("ADMIN")]);
    const plenty = await createVariant({ stock: 5 });
    const short = await createVariant({ stock: 0 });
    const order = await placeOrder(customer.id, [
      { variantId: plenty.id, quantity: 2, unitPriceCents: 1500 },
      { variantId: short.id, quantity: 1, unitPriceCents: 1500 },
    ]);
    stripe.refunds.create.mockResolvedValue({ id: "re_test", amount: totalOf(order) });

    expect(await refundReviewedOrder(order.id, admin.id)).toEqual({ ok: true });
    const afterAdmin = await reload(order.id);
    expect(afterAdmin.refundedCents).toBe(totalOf(order));

    await recordChargeRefund(chargeFor(order, totalOf(order)).id);

    const after = await reload(order.id);
    expect(after.status).toBe("REFUNDED");
    expect(after.refundedCents).toBe(totalOf(order));
    expect(after.reviewResolvedById).toBe(admin.id); // the admin's resolution stands
    expect(await ledger(order.id)).toEqual([
      { variantId: plenty.id, delta: -2, reason: "ORDER_PLACED", createdById: null },
      { variantId: plenty.id, delta: 2, reason: "ORDER_CANCELED", createdById: admin.id },
    ]);
  });

  it("reports no_order for an unknown payment and ignores a charge with no payment intent", async () => {
    stripe.charges.retrieve.mockResolvedValue({
      id: "ch_x",
      payment_intent: "pi_unknown",
      amount: 1000,
      amount_refunded: 1000,
      refunded: true,
    });
    expect(await recordChargeRefund("ch_x")).toEqual({ status: "no_order", paymentIntentId: "pi_unknown" });

    stripe.charges.retrieve.mockResolvedValue({ id: "ch_y", payment_intent: null, amount: 1000, amount_refunded: 1000, refunded: true });
    expect(await recordChargeRefund("ch_y")).toEqual({ status: "ignored" });
  });
});

describe("recordDispute", () => {
  it("records an open dispute, which blocks shipping until it's won", async () => {
    const [customer, admin] = await Promise.all([createUser(), createUser("ADMIN")]);
    const variant = await createVariant({ stock: 5 });
    const order = await placeOrder(customer.id, [{ variantId: variant.id, quantity: 1, unitPriceCents: 1500 }]);

    const dispute = disputeFor(order, "needs_response");
    expect(await recordDispute(dispute.id)).toMatchObject({ status: "recorded", orderId: order.id });

    const opened = await reload(order.id);
    expect(opened).toMatchObject({
      status: "PAID",
      stripeDisputeId: dispute.id,
      disputeStatus: "needs_response",
      disputeReason: "product_not_received",
      disputedAt: new Date(1_791_000_000 * 1000),
    });
    expect(await ship(order.id, admin.id)).toMatchObject({ ok: false, error: "DISPUTED" });

    await recordDispute(disputeFor(order, "won").id);
    expect((await reload(order.id)).disputeStatus).toBe("won");
    expect(await ship(order.id, admin.id)).toEqual({ ok: true });
  });

  it("lost before shipping: cancels the order and puts back only the units it took", async () => {
    const customer = await createUser();
    const plenty = await createVariant({ stock: 5 });
    const short = await createVariant({ stock: 0 });
    const order = await placeOrder(customer.id, [
      { variantId: plenty.id, quantity: 2, unitPriceCents: 1500 },
      { variantId: short.id, quantity: 1, unitPriceCents: 1500 },
    ]);
    expect(order.status).toBe("NEEDS_REVIEW");

    const dispute = disputeFor(order, "lost");
    await recordDispute(dispute.id);
    await recordDispute(dispute.id); // replayed

    const after = await reload(order.id);
    expect(after.status).toBe("CANCELED");
    expect(after.reviewResolvedAt).toBeInstanceOf(Date);
    expect(after.reviewResolvedById).toBeNull();
    expect(await ledger(order.id)).toEqual([
      { variantId: plenty.id, delta: -2, reason: "ORDER_PLACED", createdById: null },
      { variantId: plenty.id, delta: 2, reason: "ORDER_CANCELED", createdById: null },
    ]);
    expect(await stockOf(plenty.id)).toBe(5);
    expect(await stockOf(short.id)).toBe(0);
  });

  it("lost after shipping: records the outcome without touching status or stock", async () => {
    const [customer, admin] = await Promise.all([createUser(), createUser("ADMIN")]);
    const variant = await createVariant({ stock: 5 });
    const order = await placeOrder(customer.id, [{ variantId: variant.id, quantity: 2, unitPriceCents: 1500 }]);
    expect(await ship(order.id, admin.id)).toEqual({ ok: true });

    await recordDispute(disputeFor(order, "lost").id);

    const after = await reload(order.id);
    expect(after.status).toBe("FULFILLED");
    expect(after.disputeStatus).toBe("lost");
    expect(await stockOf(variant.id)).toBe(3);
  });

  it("reports no_order for a dispute on an unknown payment", async () => {
    stripe.disputes.retrieve.mockResolvedValue({
      id: "dp_x",
      payment_intent: "pi_unknown",
      status: "needs_response",
      reason: "fraudulent",
      created: 1_791_000_000,
    });
    expect(await recordDispute("dp_x")).toEqual({ status: "no_order", paymentIntentId: "pi_unknown" });
  });
});
