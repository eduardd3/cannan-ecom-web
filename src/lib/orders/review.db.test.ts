import Stripe from "stripe";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { fulfillCheckout } from "@/lib/checkout/fulfill";
import { adjustStockStandalone, checkStockConsistency } from "@/lib/inventory/adjust";
import { prisma } from "@/lib/prisma";
import { createUser, createVariant, resetDb, stockOf } from "../../../test/db";
import { fakeCheckout, type CheckoutLine } from "../../../test/stripe-checkout";
import { approveReviewedOrder, refundReviewedOrder } from "./review";

const stripe = vi.hoisted(() => ({
  checkout: { sessions: { retrieve: vi.fn(), listLineItems: vi.fn() } },
  refunds: { create: vi.fn() },
}));
vi.mock("@/lib/stripe", () => ({ getStripe: () => stripe }));

/** Runs a checkout through the real fulfillment, so orders reach review the way they do in production. */
async function placeOrder(userId: number, lines: CheckoutLine[]) {
  const { session, lineItems } = fakeCheckout(userId, lines);
  stripe.checkout.sessions.retrieve.mockResolvedValue(session);
  stripe.checkout.sessions.listLineItems.mockResolvedValue({ data: lineItems, has_more: false });
  const result = await fulfillCheckout(session.id);
  if (result.status !== "created") throw new Error(`placeOrder: ${result.status}`);
  return prisma.order.findUniqueOrThrow({ where: { id: result.orderId } });
}

async function restock(variantId: number, units: number) {
  const result = await adjustStockStandalone({ variantId, delta: units, reason: "RESTOCK" });
  if (!result.ok) throw new Error("restock failed");
}

async function ledger(orderId: number) {
  return prisma.inventoryAdjustment.findMany({
    where: { orderId },
    orderBy: { id: "asc" },
    select: { variantId: true, delta: true, reason: true, createdById: true },
  });
}

/** One order in review: `plenty` was deducted at checkout, `short` (ordered 3, 1 on hand) was not. */
async function reviewScenario() {
  const [customer, admin] = await Promise.all([createUser(), createUser("ADMIN")]);
  const plenty = await createVariant({ stock: 5 });
  const short = await createVariant({ stock: 1 });
  const order = await placeOrder(customer.id, [
    { variantId: plenty.id, quantity: 2, unitPriceCents: 1500 },
    { variantId: short.id, quantity: 3, unitPriceCents: 1500 },
  ]);
  expect(order.status).toBe("NEEDS_REVIEW");
  return { admin, plenty, short, order };
}

beforeEach(async () => {
  vi.clearAllMocks();
  stripe.refunds.create.mockResolvedValue({ id: "re_test", amount: 3500 });
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("approveReviewedOrder", () => {
  it("after a restock, takes stock only for the line that never had any and marks the order PAID", async () => {
    const { admin, plenty, short, order } = await reviewScenario();
    await restock(short.id, 4);

    expect(await approveReviewedOrder(order.id, admin.id)).toEqual({ ok: true });

    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe("PAID");
    expect(after.reviewReason).toBe(order.reviewReason); // kept as history
    expect(after.reviewResolvedById).toBe(admin.id);
    expect(after.reviewResolvedAt).toBeInstanceOf(Date);

    expect(await ledger(order.id)).toEqual([
      { variantId: plenty.id, delta: -2, reason: "ORDER_PLACED", createdById: null },
      { variantId: short.id, delta: -3, reason: "ORDER_PLACED", createdById: admin.id },
    ]);
    expect(await stockOf(plenty.id)).toBe(3);
    expect(await stockOf(short.id)).toBe(2); // 1 + 4 restocked - 3
    expect((await checkStockConsistency(short.id))?.consistent).toBe(true);
  });

  it("approves an order that only had a subtotal mismatch without touching stock", async () => {
    const [customer, admin] = await Promise.all([createUser(), createUser("ADMIN")]);
    const variant = await createVariant({ stock: 5 });
    const { session, lineItems } = fakeCheckout(customer.id, [{ variantId: variant.id, quantity: 1, unitPriceCents: 1500 }], {
      subtotalAdjustCents: 100,
    });
    stripe.checkout.sessions.retrieve.mockResolvedValue(session);
    stripe.checkout.sessions.listLineItems.mockResolvedValue({ data: lineItems, has_more: false });
    const created = await fulfillCheckout(session.id);
    if (created.status !== "created") throw new Error("expected an order");

    expect(await approveReviewedOrder(created.orderId, admin.id)).toEqual({ ok: true });
    expect(await stockOf(variant.id)).toBe(4);
    expect(await ledger(created.orderId)).toHaveLength(1);
  });

  it("changes nothing while a line is still short", async () => {
    const { admin, short, order } = await reviewScenario();
    const ledgerBefore = await ledger(order.id);

    const result = await approveReviewedOrder(order.id, admin.id);

    expect(result).toEqual({
      ok: false,
      error: "INSUFFICIENT_STOCK",
      message: `Restock before approving. ${short.sku}: needs 3, 1 in stock.`,
    });
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe("NEEDS_REVIEW");
    expect(after.reviewResolvedAt).toBeNull();
    expect(await ledger(order.id)).toEqual(ledgerBefore);
    expect(await stockOf(short.id)).toBe(1);
  });

  it("rolls back lines already placed when a later line is short", async () => {
    const [customer, admin] = await Promise.all([createUser(), createUser("ADMIN")]);
    const first = await createVariant({ stock: 0 });
    const second = await createVariant({ stock: 0 });
    const order = await placeOrder(customer.id, [
      { variantId: first.id, quantity: 1, unitPriceCents: 1500 },
      { variantId: second.id, quantity: 1, unitPriceCents: 1500 },
    ]);
    await restock(first.id, 1); // the first line could be placed, the second can't

    expect(await approveReviewedOrder(order.id, admin.id)).toMatchObject({ ok: false, error: "INSUFFICIENT_STOCK" });
    expect(await stockOf(first.id)).toBe(1);
    expect(await ledger(order.id)).toEqual([]);
  });

  it("lets only one of two simultaneous approvals through", async () => {
    const { admin, short, order } = await reviewScenario();
    await restock(short.id, 10);

    const results = await Promise.all([
      approveReviewedOrder(order.id, admin.id),
      approveReviewedOrder(order.id, admin.id),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toMatchObject({ error: "NOT_IN_REVIEW" });
    expect(await stockOf(short.id)).toBe(8); // 1 + 10 - 3, deducted once
  });

  it("refuses orders that aren't in review, or don't exist", async () => {
    const customer = await createUser();
    const admin = await createUser("ADMIN");
    const variant = await createVariant({ stock: 5 });
    const paid = await placeOrder(customer.id, [{ variantId: variant.id, quantity: 1, unitPriceCents: 1500 }]);

    expect(await approveReviewedOrder(paid.id, admin.id)).toMatchObject({ ok: false, error: "NOT_IN_REVIEW" });
    expect(await approveReviewedOrder(999_999, admin.id)).toMatchObject({ ok: false, error: "NOT_FOUND" });
    expect(await stockOf(variant.id)).toBe(4);
  });
});

describe("refundReviewedOrder", () => {
  it("refunds in Stripe, puts back only the units the order took, and marks it REFUNDED", async () => {
    const { admin, plenty, short, order } = await reviewScenario();

    expect(await refundReviewedOrder(order.id, admin.id)).toEqual({ ok: true });

    expect(stripe.refunds.create).toHaveBeenCalledOnce();
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      { payment_intent: order.stripePaymentIntentId, metadata: { orderId: String(order.id) } },
      { idempotencyKey: `order-${order.id}-refund` },
    );

    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe("REFUNDED");
    expect(after.reviewResolvedById).toBe(admin.id);
    expect(after.refundedCents).toBe(3500); // the amount Stripe's refund reported

    expect(await ledger(order.id)).toEqual([
      { variantId: plenty.id, delta: -2, reason: "ORDER_PLACED", createdById: null },
      { variantId: plenty.id, delta: 2, reason: "ORDER_CANCELED", createdById: admin.id },
    ]);
    expect(await stockOf(plenty.id)).toBe(5);
    expect(await stockOf(short.id)).toBe(1);
    expect((await checkStockConsistency(plenty.id))?.consistent).toBe(true);
  });

  it("changes nothing when Stripe rejects the refund", async () => {
    const { admin, plenty, order } = await reviewScenario();
    stripe.refunds.create.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({ message: "Insufficient balance", type: "invalid_request_error" }),
    );
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await refundReviewedOrder(order.id, admin.id);

    expect(result).toMatchObject({ ok: false, error: "STRIPE_ERROR" });
    expect(result.ok ? "" : result.message).toMatch(/Insufficient balance/);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("NEEDS_REVIEW");
    expect(await stockOf(plenty.id)).toBe(3);
    errorLog.mockRestore();
  });

  it("finishes recording a refund that Stripe already has", async () => {
    const { admin, order } = await reviewScenario();
    stripe.refunds.create.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({
        message: "Charge has already been refunded.",
        type: "invalid_request_error",
        code: "charge_already_refunded",
      }),
    );

    expect(await refundReviewedOrder(order.id, admin.id)).toEqual({ ok: true });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("REFUNDED");
  });

  it("can't race an approval: exactly one of approve and refund wins", async () => {
    const { admin, short, order } = await reviewScenario();
    await restock(short.id, 10);
    // A slow Stripe call keeps the refund's lock held while the approve arrives.
    stripe.refunds.create.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ id: "re_test", amount: 3500 }), 200)));

    const [refund, approve] = await Promise.all([
      refundReviewedOrder(order.id, admin.id),
      new Promise((resolve) => setTimeout(resolve, 50)).then(() => approveReviewedOrder(order.id, admin.id)),
    ]);

    expect(refund).toEqual({ ok: true });
    expect(approve).toMatchObject({ ok: false, error: "NOT_IN_REVIEW" });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("REFUNDED");
    expect(await stockOf(short.id)).toBe(11); // never deducted
  });

  it("refuses orders that aren't in review without calling Stripe", async () => {
    const customer = await createUser();
    const admin = await createUser("ADMIN");
    const variant = await createVariant({ stock: 5 });
    const paid = await placeOrder(customer.id, [{ variantId: variant.id, quantity: 1, unitPriceCents: 1500 }]);

    expect(await refundReviewedOrder(paid.id, admin.id)).toMatchObject({ ok: false, error: "NOT_IN_REVIEW" });
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });
});
