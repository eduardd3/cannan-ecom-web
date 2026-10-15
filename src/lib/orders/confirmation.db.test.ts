import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { fulfillCheckout } from "@/lib/checkout/fulfill";
import { adjustStockStandalone } from "@/lib/inventory/adjust";
import { prisma } from "@/lib/prisma";
import { createUser, createVariant, resetDb } from "../../../test/db";
import { fakeCheckout, type CheckoutLine } from "../../../test/stripe-checkout";
import { sendOrderConfirmation } from "./confirmation";
import { approveReviewedOrder, refundReviewedOrder } from "./review";

const stripe = vi.hoisted(() => ({
  checkout: { sessions: { retrieve: vi.fn(), listLineItems: vi.fn() } },
  refunds: { create: vi.fn() },
}));
vi.mock("@/lib/stripe", () => ({ getStripe: () => stripe }));

const sendEmail = vi.hoisted(() => vi.fn());
vi.mock("@/lib/email/client", () => ({ sendEmail }));

async function placeOrder(userId: number, lines: CheckoutLine[]) {
  const { session, lineItems } = fakeCheckout(userId, lines);
  stripe.checkout.sessions.retrieve.mockResolvedValue(session);
  stripe.checkout.sessions.listLineItems.mockResolvedValue({ data: lineItems, has_more: false });
  const result = await fulfillCheckout(session.id);
  if (result.status !== "created") throw new Error(`placeOrder: ${result.status}`);
  return prisma.order.findUniqueOrThrow({ where: { id: result.orderId } });
}

async function sentAt(orderId: number) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  return order.confirmationEmailSentAt;
}

/** An order that went to review: ordered 2, only 1 on hand. */
async function reviewOrder() {
  const [customer, admin] = await Promise.all([createUser(), createUser("ADMIN")]);
  const variant = await createVariant({ stock: 1 });
  const order = await placeOrder(customer.id, [{ variantId: variant.id, quantity: 2, unitPriceCents: 1500 }]);
  expect(order.status).toBe("NEEDS_REVIEW");
  return { admin, variant, order };
}

beforeEach(async () => {
  vi.clearAllMocks();
  sendEmail.mockResolvedValue({ ok: true, id: "email_test" });
  stripe.refunds.create.mockResolvedValue({ id: "re_test", amount: 3500 });
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("sendOrderConfirmation", () => {
  it("sends once for a PAID order from the orders sender, with an idempotency key", async () => {
    const customer = await createUser();
    const variant = await createVariant({ stock: 5 });
    const order = await placeOrder(customer.id, [{ variantId: variant.id, quantity: 2, unitPriceCents: 1500 }]);

    expect(await sendOrderConfirmation(order.id)).toBe("sent");
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: order.email,
        from: "orders@mail.shopcannan.com",
        subject: `Your Cannan order #${order.id}`,
        idempotencyKey: `order-confirmation/${order.id}`,
      }),
    );
    expect(await sentAt(order.id)).toBeInstanceOf(Date);

    // A redelivered webhook calls it again: no second email.
    expect(await sendOrderConfirmation(order.id)).toBe("already_sent");
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("leaves the order unmarked when the send fails, so a later call retries", async () => {
    const customer = await createUser();
    const variant = await createVariant({ stock: 5 });
    const order = await placeOrder(customer.id, [{ variantId: variant.id, quantity: 1, unitPriceCents: 1500 }]);
    sendEmail.mockResolvedValueOnce({ ok: false, error: "Email send failed" });

    expect(await sendOrderConfirmation(order.id)).toBe("failed");
    expect(await sentAt(order.id)).toBeNull();

    expect(await sendOrderConfirmation(order.id)).toBe("sent");
    expect(await sentAt(order.id)).toBeInstanceOf(Date);
  });

  it("holds the email while the order is in review and sends it after approval", async () => {
    const { admin, variant, order } = await reviewOrder();

    expect(await sendOrderConfirmation(order.id)).toBe("not_paid");
    expect(sendEmail).not.toHaveBeenCalled();

    const restock = await adjustStockStandalone({ variantId: variant.id, delta: 5, reason: "RESTOCK" });
    if (!restock.ok) throw new Error("restock failed");
    expect(await approveReviewedOrder(order.id, admin.id)).toEqual({ ok: true });

    expect(await sendOrderConfirmation(order.id)).toBe("sent");
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("never sends for a review order that was refunded", async () => {
    const { admin, order } = await reviewOrder();
    expect(await refundReviewedOrder(order.id, admin.id)).toEqual({ ok: true });

    expect(await sendOrderConfirmation(order.id)).toBe("not_paid");
    expect(sendEmail).not.toHaveBeenCalled();
    expect(await sentAt(order.id)).toBeNull();
  });

  it("can't be marked sent while in review (CHECK constraint)", async () => {
    const { order } = await reviewOrder();
    await expect(
      prisma.order.update({ where: { id: order.id }, data: { confirmationEmailSentAt: new Date() } }),
    ).rejects.toThrow();
  });

  it("returns not_found for an unknown order", async () => {
    expect(await sendOrderConfirmation(999_999)).toBe("not_found");
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
