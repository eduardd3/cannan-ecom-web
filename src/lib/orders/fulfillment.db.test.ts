import { afterAll, beforeEach, describe, expect, it } from "vitest";

import type { OrderStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createUser, resetDb } from "../../../test/db";
import { fulfillOrder, updateTracking } from "./fulfillment";

let sequence = 0;

/** Fulfillment only looks at the order row, so no lines or stock are needed. */
async function createOrder(userId: number, status: OrderStatus) {
  sequence += 1;
  return prisma.order.create({
    data: {
      userId,
      status,
      reviewReason: status === "NEEDS_REVIEW" ? "Short on stock" : null,
      subtotalCents: 1500,
      shippingCents: 500,
      taxCents: 0,
      stripeCheckoutSessionId: `cs_fulfill_${sequence}`,
      email: "buyer@example.com",
    },
  });
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("fulfillOrder", () => {
  it("marks a PAID order FULFILLED with the shipment details", async () => {
    const [customer, admin] = await Promise.all([createUser(), createUser("ADMIN")]);
    const order = await createOrder(customer.id, "PAID");

    const result = await fulfillOrder({ orderId: order.id, carrier: "UPS", trackingNumber: "1Z999AA10123456784", adminId: admin.id });

    expect(result).toEqual({ ok: true });
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after).toMatchObject({
      status: "FULFILLED",
      carrier: "UPS",
      trackingNumber: "1Z999AA10123456784",
      fulfilledById: admin.id,
    });
    expect(after.fulfilledAt).toBeInstanceOf(Date);
  });

  it("refuses an order still in review", async () => {
    const [customer, admin] = await Promise.all([createUser(), createUser("ADMIN")]);
    const order = await createOrder(customer.id, "NEEDS_REVIEW");

    const result = await fulfillOrder({ orderId: order.id, carrier: "USPS", trackingNumber: "94001000", adminId: admin.id });

    expect(result).toMatchObject({ ok: false, error: "NOT_PAID", message: /Resolve the review/ });
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe("NEEDS_REVIEW");
    expect(after.carrier).toBeNull();
  });

  it.each(["FULFILLED", "REFUNDED", "CANCELED"] as const)("refuses a %s order", async (status) => {
    const [customer, admin] = await Promise.all([createUser(), createUser("ADMIN")]);
    const order =
      status === "FULFILLED"
        ? await prisma.order.update({
            where: { id: (await createOrder(customer.id, "PAID")).id },
            data: { status, carrier: "USPS", trackingNumber: "OLD12345", fulfilledAt: new Date() },
          })
        : await createOrder(customer.id, status);

    const result = await fulfillOrder({ orderId: order.id, carrier: "FEDEX", trackingNumber: "NEW12345", adminId: admin.id });

    expect(result).toMatchObject({ ok: false, error: "NOT_PAID" });
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.trackingNumber).toBe(order.trackingNumber);
  });

  it("reports a missing order", async () => {
    const admin = await createUser("ADMIN");
    expect(await fulfillOrder({ orderId: 999, carrier: "USPS", trackingNumber: "94001000", adminId: admin.id })).toMatchObject({
      ok: false,
      error: "NOT_FOUND",
    });
  });

  it("lets only one of two simultaneous submissions through", async () => {
    const [customer, admin] = await Promise.all([createUser(), createUser("ADMIN")]);
    const order = await createOrder(customer.id, "PAID");

    const results = await Promise.all([
      fulfillOrder({ orderId: order.id, carrier: "UPS", trackingNumber: "FIRST12345", adminId: admin.id }),
      fulfillOrder({ orderId: order.id, carrier: "UPS", trackingNumber: "SECOND1234", adminId: admin.id }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    const winner = results[0].ok ? "FIRST12345" : "SECOND1234";
    expect(after.trackingNumber).toBe(winner);
  });

  it("is backed by a CHECK: FULFILLED without shipment details is refused by the database", async () => {
    const customer = await createUser();
    const order = await createOrder(customer.id, "PAID");

    await expect(prisma.order.update({ where: { id: order.id }, data: { status: "FULFILLED" } })).rejects.toThrow(
      /Order_fulfillment_check/,
    );
    await expect(
      prisma.order.update({ where: { id: order.id }, data: { carrier: "UPS" } }),
    ).rejects.toThrow(/Order_fulfillment_check/);
  });
});

describe("updateTracking", () => {
  /** A PAID order shipped through fulfillOrder, as it would be from the admin page. */
  async function shippedOrder() {
    const [customer, shipper, editor] = await Promise.all([createUser(), createUser("ADMIN"), createUser("ADMIN")]);
    const order = await createOrder(customer.id, "PAID");
    const shipped = await fulfillOrder({ orderId: order.id, carrier: "USPS", trackingNumber: "TYPO12345", adminId: shipper.id });
    if (!shipped.ok) throw new Error("shippedOrder: fulfill failed");
    return { order: await prisma.order.findUniqueOrThrow({ where: { id: order.id } }), shipper, editor };
  }

  it("corrects carrier and tracking, records the edit, and keeps the ship date", async () => {
    const { order, shipper, editor } = await shippedOrder();

    const result = await updateTracking({ orderId: order.id, carrier: "UPS", trackingNumber: "1Z999AA10123456784", adminId: editor.id });

    expect(result).toEqual({ ok: true });
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after).toMatchObject({
      status: "FULFILLED",
      carrier: "UPS",
      trackingNumber: "1Z999AA10123456784",
      fulfilledAt: order.fulfilledAt,
      fulfilledById: shipper.id,
      trackingUpdatedById: editor.id,
    });
    expect(after.trackingUpdatedAt).toBeInstanceOf(Date);
  });

  it("succeeds without stamping an edit when nothing changed", async () => {
    const { order, editor } = await shippedOrder();

    const result = await updateTracking({ orderId: order.id, carrier: "USPS", trackingNumber: "TYPO12345", adminId: editor.id });

    expect(result).toEqual({ ok: true });
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.trackingUpdatedAt).toBeNull();
    expect(after.trackingUpdatedById).toBeNull();
  });

  it("refuses an order that hasn't shipped", async () => {
    const [customer, admin] = await Promise.all([createUser(), createUser("ADMIN")]);
    const order = await createOrder(customer.id, "PAID");

    const result = await updateTracking({ orderId: order.id, carrier: "UPS", trackingNumber: "1Z999AA10123456784", adminId: admin.id });

    expect(result).toMatchObject({ ok: false, error: "NOT_FULFILLED" });
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after).toMatchObject({ status: "PAID", carrier: null, trackingNumber: null, trackingUpdatedAt: null });
  });

  it("refuses a shipped order that has since been refunded", async () => {
    const { order, editor } = await shippedOrder();
    await prisma.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });

    const result = await updateTracking({ orderId: order.id, carrier: "UPS", trackingNumber: "NEW12345", adminId: editor.id });

    expect(result).toMatchObject({ ok: false, error: "NOT_FULFILLED" });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).trackingNumber).toBe("TYPO12345");
  });

  it("reports a missing order", async () => {
    const admin = await createUser("ADMIN");
    expect(await updateTracking({ orderId: 999, carrier: "USPS", trackingNumber: "94001000", adminId: admin.id })).toMatchObject({
      ok: false,
      error: "NOT_FOUND",
    });
  });

  it("is backed by a CHECK: an unshipped order can't carry a tracking edit", async () => {
    const customer = await createUser();
    const order = await createOrder(customer.id, "PAID");

    await expect(
      prisma.order.update({ where: { id: order.id }, data: { trackingUpdatedAt: new Date() } }),
    ).rejects.toThrow(/Order_tracking_updated_check/);
  });
});
