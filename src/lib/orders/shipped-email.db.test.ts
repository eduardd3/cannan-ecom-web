import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Carrier } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createUser, resetDb } from "../../../test/db";
import { fulfillOrder, updateTracking } from "./fulfillment";
import { sendShippedEmail } from "./shipped-email";

const sendEmail = vi.hoisted(() => vi.fn());
vi.mock("@/lib/email/client", () => ({ sendEmail }));

let sequence = 0;

/** The email only reads the order row and its lines' names, so no stock is needed. */
async function createPaidOrder(userId: number) {
  sequence += 1;
  return prisma.order.create({
    data: {
      userId,
      status: "PAID",
      subtotalCents: 1500,
      shippingCents: 500,
      taxCents: 0,
      stripeCheckoutSessionId: `cs_shipped_${sequence}`,
      email: "buyer@example.com",
    },
  });
}

async function shippedOrder(carrier: Carrier = "USPS", trackingNumber = "9400100000000000000000") {
  const [customer, admin] = await Promise.all([createUser(), createUser("ADMIN")]);
  const order = await createPaidOrder(customer.id);
  expect(await fulfillOrder({ orderId: order.id, carrier, trackingNumber, adminId: admin.id })).toEqual({ ok: true });
  return { admin, order };
}

async function sentAt(orderId: number) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  return order.shippedEmailSentAt;
}

/** The props the template was rendered with on the nth send. */
function emailProps(call = 0) {
  return sendEmail.mock.calls[call][0].react.props;
}

beforeEach(async () => {
  vi.clearAllMocks();
  sendEmail.mockResolvedValue({ ok: true, id: "email_test" });
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("sendShippedEmail", () => {
  it("sends once for a FULFILLED order from the orders sender, with an idempotency key", async () => {
    const { order } = await shippedOrder();

    expect(await sendShippedEmail(order.id)).toBe("sent");
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: order.email,
        from: "orders@mail.shopcannan.com",
        subject: `Your Cannan order #${order.id} has shipped`,
        idempotencyKey: `order-shipped/${order.id}`,
      }),
    );
    expect(emailProps()).toMatchObject({
      carrier: "USPS",
      trackingNumber: "9400100000000000000000",
      trackingUrl: expect.stringContaining("usps.com"),
      orderUrl: expect.stringMatching(new RegExp(`/orders/${order.id}$`)),
    });
    expect(await sentAt(order.id)).toBeInstanceOf(Date);

    expect(await sendShippedEmail(order.id)).toBe("already_sent");
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("sends no link for an OTHER carrier", async () => {
    const { order } = await shippedOrder("OTHER", "LOCAL-12345");

    expect(await sendShippedEmail(order.id)).toBe("sent");
    expect(emailProps()).toMatchObject({ carrier: "Other", trackingNumber: "LOCAL-12345", trackingUrl: null });
  });

  it("leaves the order unmarked when the send fails, so a later call retries", async () => {
    const { order } = await shippedOrder();
    sendEmail.mockResolvedValueOnce({ ok: false, error: "Email send failed" });

    expect(await sendShippedEmail(order.id)).toBe("failed");
    expect(await sentAt(order.id)).toBeNull();

    expect(await sendShippedEmail(order.id)).toBe("sent");
    expect(await sentAt(order.id)).toBeInstanceOf(Date);
  });

  it("doesn't send for an order that hasn't shipped", async () => {
    const customer = await createUser();
    const order = await createPaidOrder(customer.id);

    expect(await sendShippedEmail(order.id)).toBe("not_fulfilled");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("doesn't send again after a tracking correction", async () => {
    const { admin, order } = await shippedOrder();
    expect(await sendShippedEmail(order.id)).toBe("sent");

    const fix = await updateTracking({ orderId: order.id, carrier: "UPS", trackingNumber: "1Z999AA10123456784", adminId: admin.id });
    expect(fix).toEqual({ ok: true });

    expect(await sendShippedEmail(order.id)).toBe("already_sent");
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("can't be marked sent on an order that never shipped (CHECK constraint)", async () => {
    const customer = await createUser();
    const order = await createPaidOrder(customer.id);
    await expect(
      prisma.order.update({ where: { id: order.id }, data: { shippedEmailSentAt: new Date() } }),
    ).rejects.toThrow();
  });

  it("returns not_found for an unknown order", async () => {
    expect(await sendShippedEmail(999_999)).toBe("not_found");
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
