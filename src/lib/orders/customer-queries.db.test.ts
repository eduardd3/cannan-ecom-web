import { afterAll, beforeEach, describe, expect, it } from "vitest";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createUser, createVariant, resetDb } from "../../../test/db";
import { getCustomerOrder, listCustomerOrders } from "./customer-queries";

let sequence = 0;

/** An order written directly: these tests read orders, not place them. */
async function createOrder(userId: number, data: Partial<Prisma.OrderUncheckedCreateInput> = {}) {
  sequence += 1;
  const variant = await createVariant({ stock: 0 });
  return prisma.order.create({
    data: {
      userId,
      subtotalCents: 3000,
      shippingCents: 500,
      taxCents: 250,
      stripeCheckoutSessionId: `cs_test_cq_${sequence}`,
      stripePaymentIntentId: `pi_test_cq_${sequence}`,
      email: "buyer@example.com",
      shippingAddress: { name: "Ana Buyer", line1: "1 Main St", city: "Los Angeles", state: "CA", postal_code: "90001", country: "US" },
      items: {
        create: { variantId: variant.id, productName: "Saved name", sku: variant.sku, unitPriceCents: 1500, quantity: 2 },
      },
      ...data,
    },
  });
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("listCustomerOrders", () => {
  it("lists only the customer's own orders, newest first, with totals", async () => {
    const [ana, ben] = await Promise.all([createUser(), createUser()]);
    const older = await createOrder(ana.id, { createdAt: new Date("2026-10-01") });
    const newer = await createOrder(ana.id, { createdAt: new Date("2026-10-10") });
    await createOrder(ben.id);

    const { orders, truncated } = await listCustomerOrders(ana.id);
    expect(orders.map((o) => o.id)).toEqual([newer.id, older.id]);
    expect(orders[0]).toMatchObject({ totalCents: 3750, itemCount: 2, status: "PAID" });    expect(truncated).toBe(false);
  });
});

describe("getCustomerOrder", () => {
  it("returns null for another customer's order", async () => {
    const [ana, ben] = await Promise.all([createUser(), createUser()]);
    const order = await createOrder(ana.id);

    expect(await getCustomerOrder(ben.id, order.id)).toBeNull();
    expect(await getCustomerOrder(ana.id, order.id)).not.toBeNull();
  });

  it("returns null for an order that doesn't exist", async () => {
    const ana = await createUser();
    expect(await getCustomerOrder(ana.id, 999_999)).toBeNull();
  });

  it("exposes no internal fields on a review order", async () => {
    const ana = await createUser();
    const order = await createOrder(ana.id, { status: "NEEDS_REVIEW", reviewReason: "Short on stock" });

    const view = await getCustomerOrder(ana.id, order.id);
    expect(view).not.toBeNull();
    expect(Object.keys(view!).sort()).toEqual(
      [
        "createdAt",
        "id",
        "items",
        "refundedCents",
        "shipment",
        "shippingAddress",
        "shippingCents",
        "status",
        "subtotalCents",
        "taxCents",
        "totalCents",
      ].sort(),
    );
    expect(JSON.stringify(view)).not.toContain("Short on stock");
    expect(JSON.stringify(view)).not.toContain("cs_test_cq_");
  });

  it("uses the saved item name and links the active product", async () => {
    const ana = await createUser();
    const order = await createOrder(ana.id);

    const view = await getCustomerOrder(ana.id, order.id);
    expect(view!.items).toHaveLength(1);
    expect(view!.items[0]).toMatchObject({ productName: "Saved name", quantity: 2, unitPriceCents: 1500 });
    expect(view!.items[0].productHref).toMatch(/^\/products\/product-\d+$/);
  });

  it("picks the variant's image, else the product's first image", async () => {
    const ana = await createUser();
    const order = await createOrder(ana.id);
    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id }, include: { variant: true } });
    const productId = item.variant.productId;
    await prisma.productImage.createMany({
      data: [
        { productId, key: "products/test/2.jpg", alt: "Second", position: 1 },
        { productId, key: "products/test/1.jpg", alt: "First", position: 0 },
      ],
    });

    let view = await getCustomerOrder(ana.id, order.id);
    expect(view!.items[0]).toMatchObject({ imageUrl: "/seed-images/products/test/1.jpg", imageAlt: "First" });

    await prisma.productImage.create({
      data: { productId, variantId: item.variantId, key: "products/test/v.jpg", alt: "Variant", position: 2 },
    });
    view = await getCustomerOrder(ana.id, order.id);
    expect(view!.items[0]).toMatchObject({ imageUrl: "/seed-images/products/test/v.jpg", imageAlt: "Variant" });
  });

  it("drops the link once the product is no longer active", async () => {
    const ana = await createUser();
    const order = await createOrder(ana.id);
    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id }, include: { variant: true } });
    await prisma.product.update({ where: { id: item.variant.productId }, data: { status: "ARCHIVED" } });

    const view = await getCustomerOrder(ana.id, order.id);
    expect(view!.items[0].productHref).toBeNull();
  });

  it("shows the shipment only while the order is FULFILLED", async () => {
    const ana = await createUser();
    const shipped = { carrier: "USPS", trackingNumber: "9400100000000000000000", fulfilledAt: new Date() } as const;
    const fulfilled = await createOrder(ana.id, { status: "FULFILLED", ...shipped });
    const paid = await createOrder(ana.id);

    expect((await getCustomerOrder(ana.id, fulfilled.id))!.shipment).toMatchObject({
      carrier: "USPS",
      trackingNumber: shipped.trackingNumber,
    });
    expect((await getCustomerOrder(ana.id, paid.id))!.shipment).toBeNull();
  });
});
