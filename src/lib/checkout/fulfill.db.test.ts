import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { checkStockConsistency } from "@/lib/inventory/adjust";
import { prisma } from "@/lib/prisma";
import { addToCart, createUser, createVariant, resetDb, stockOf } from "../../../test/db";
import { fakeCheckout } from "../../../test/stripe-checkout";
import { fulfillCheckout } from "./fulfill";

const stripe = vi.hoisted(() => ({
  checkout: { sessions: { retrieve: vi.fn(), listLineItems: vi.fn() } },
}));
vi.mock("@/lib/stripe", () => ({ getStripe: () => stripe }));

function stripeReturns(checkout: ReturnType<typeof fakeCheckout>) {
  stripe.checkout.sessions.retrieve.mockResolvedValue(checkout.session);
  stripe.checkout.sessions.listLineItems.mockResolvedValue({ data: checkout.lineItems, has_more: false });
  return checkout.session.id;
}

beforeEach(async () => {
  vi.clearAllMocks();
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("fulfillCheckout", () => {
  it("creates a PAID order, takes stock, and clears only the purchased cart lines", async () => {
    const user = await createUser();
    const a = await createVariant({ stock: 5 });
    const b = await createVariant({ stock: 3 });
    const notBought = await createVariant({ stock: 1 });
    await addToCart(user.id, a.id, 2);
    await addToCart(user.id, b.id, 1);
    await addToCart(user.id, notBought.id, 1);

    const sessionId = stripeReturns(
      fakeCheckout(user.id, [
        { variantId: a.id, quantity: 2, unitPriceCents: 1500 },
        { variantId: b.id, quantity: 1, unitPriceCents: 1500 },
      ]),
    );
    const result = await fulfillCheckout(sessionId);

    expect(result).toMatchObject({ status: "created", needsReview: false });
    const order = await prisma.order.findUniqueOrThrow({ where: { stripeCheckoutSessionId: sessionId } });
    expect(order.status).toBe("PAID");
    expect(order.reviewReason).toBeNull();
    expect(await stockOf(a.id)).toBe(3);
    expect(await stockOf(b.id)).toBe(2);
    expect((await checkStockConsistency(a.id))?.consistent).toBe(true);

    const cartLines = await prisma.cartItem.findMany({ select: { variantId: true } });
    expect(cartLines).toEqual([{ variantId: notBought.id }]);
  });

  it("sends an order with a short line to review and deducts only the lines that had stock", async () => {
    const user = await createUser();
    const plenty = await createVariant({ stock: 5 });
    const short = await createVariant({ stock: 1 });

    const sessionId = stripeReturns(
      fakeCheckout(user.id, [
        { variantId: plenty.id, quantity: 2, unitPriceCents: 1500 },
        { variantId: short.id, quantity: 3, unitPriceCents: 1500 },
      ]),
    );
    const result = await fulfillCheckout(sessionId);

    expect(result).toMatchObject({ status: "created", needsReview: true });
    const order = await prisma.order.findUniqueOrThrow({ where: { stripeCheckoutSessionId: sessionId } });
    expect(order.status).toBe("NEEDS_REVIEW");
    expect(order.reviewReason).toBe(`${short.sku}: ordered 3, available 1`);
    expect(await stockOf(plenty.id)).toBe(3);
    expect(await stockOf(short.id)).toBe(1);
    const placed = await prisma.inventoryAdjustment.findMany({ where: { orderId: order.id } });
    expect(placed.map((row) => row.variantId)).toEqual([plenty.id]);
  });

  it("sends an order to review when Stripe's subtotal doesn't match the lines", async () => {
    const user = await createUser();
    const variant = await createVariant({ stock: 5 });
    const sessionId = stripeReturns(
      fakeCheckout(user.id, [{ variantId: variant.id, quantity: 1, unitPriceCents: 1500 }], {
        subtotalAdjustCents: 100,
      }),
    );

    await fulfillCheckout(sessionId);

    const order = await prisma.order.findUniqueOrThrow({ where: { stripeCheckoutSessionId: sessionId } });
    expect(order.status).toBe("NEEDS_REVIEW");
    expect(order.reviewReason).toMatch(/line items sum to 1500, Stripe subtotal is 1600/);
    expect(await stockOf(variant.id)).toBe(4);
  });

  it("is idempotent: a repeat or concurrent delivery creates one order and deducts once", async () => {
    const user = await createUser();
    const variant = await createVariant({ stock: 5 });
    const sessionId = stripeReturns(
      fakeCheckout(user.id, [{ variantId: variant.id, quantity: 2, unitPriceCents: 1500 }]),
    );

    const [first, second] = await Promise.all([fulfillCheckout(sessionId), fulfillCheckout(sessionId)]);
    const third = await fulfillCheckout(sessionId);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual(["already_fulfilled", "created"]);
    expect(third.status).toBe("already_fulfilled");
    expect(await prisma.order.count()).toBe(1);
    expect(await stockOf(variant.id)).toBe(3);
  });

  it("does nothing for a session that isn't paid yet", async () => {
    const user = await createUser();
    const variant = await createVariant({ stock: 5 });
    const sessionId = stripeReturns(
      fakeCheckout(user.id, [{ variantId: variant.id, quantity: 1, unitPriceCents: 1500 }], {
        paymentStatus: "unpaid",
      }),
    );

    expect(await fulfillCheckout(sessionId)).toEqual({ status: "not_paid" });
    expect(await prisma.order.count()).toBe(0);
    expect(await stockOf(variant.id)).toBe(5);
  });
});
