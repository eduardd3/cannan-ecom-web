// lib/orders/customer-queries.ts
//
// Customer READ side for /purchases. Every query is scoped to the signed-in
// user's id, and selects only what the customer may see: no review reason,
// staff, Stripe ids, or inventory history.
import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getImageUrl } from "@/lib/storage";

// Customers place few orders; the list says when it's cut off.
export const CUSTOMER_ORDER_LIMIT = 100;

// Same image rule as the cart: the variant's first image, else the product's.
const firstImage = {
  select: { key: true, alt: true },
  orderBy: { position: "asc" },
  take: 1,
} satisfies Prisma.ProductImageFindManyArgs;

const itemSelect = {
  orderBy: { id: "asc" },
  select: {
    id: true,
    productName: true,
    variantLabel: true,
    unitPriceCents: true,
    quantity: true,
    variant: {
      select: {
        images: firstImage,
        product: { select: { slug: true, status: true, images: firstImage } },
      },
    },
  },
} satisfies Prisma.OrderItemFindManyArgs;

type ItemRow = Prisma.OrderItemGetPayload<{ select: typeof itemSelect.select }>;

// Names and prices are the copies saved at purchase, so later product edits
// don't rewrite past orders. Only the image and link are live.
function toItemView(item: ItemRow) {
  const { product } = item.variant;
  const image = item.variant.images[0] ?? product.images[0] ?? null;
  return {
    id: item.id,
    productName: item.productName,
    variantLabel: item.variantLabel,
    unitPriceCents: item.unitPriceCents,
    quantity: item.quantity,
    // A draft or archived product's page 404s, so no link to it.
    productHref: product.status === "ACTIVE" ? `/products/${product.slug}` : null,
    imageUrl: image ? getImageUrl(image.key) : null,
    imageAlt: image?.alt ?? null,
  };
}

export type CustomerOrderItem = ReturnType<typeof toItemView>;

export async function listCustomerOrders(userId: number) {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: CUSTOMER_ORDER_LIMIT + 1,
    select: {
      id: true,
      createdAt: true,
      status: true,
      subtotalCents: true,
      shippingCents: true,
      taxCents: true,
      items: { select: { quantity: true } },
    },
  });

  return {
    orders: orders.slice(0, CUSTOMER_ORDER_LIMIT).map((order) => ({
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      totalCents: order.subtotalCents + order.shippingCents + order.taxCents,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    })),
    truncated: orders.length > CUSTOMER_ORDER_LIMIT,
  };
}

/** The order if it belongs to this user; null for someone else's or a missing one. */
export async function getCustomerOrder(userId: number, orderId: number) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: {
      id: true,
      createdAt: true,
      status: true,
      subtotalCents: true,
      shippingCents: true,
      taxCents: true,
      refundedCents: true,
      shippingAddress: true,
      carrier: true,
      trackingNumber: true,
      fulfilledAt: true,
      items: itemSelect,
    },
  });
  if (!order) return null;

  // Shipment fields are kept as history if the order later changes status,
  // so they're shown only while it's FULFILLED.
  const shipment =
    order.status === "FULFILLED" && order.carrier && order.trackingNumber && order.fulfilledAt
      ? { carrier: order.carrier, trackingNumber: order.trackingNumber, shippedAt: order.fulfilledAt }
      : null;

  return {
    id: order.id,
    createdAt: order.createdAt,
    status: order.status,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.subtotalCents + order.shippingCents + order.taxCents,
    refundedCents: order.refundedCents,
    shippingAddress: order.shippingAddress,
    shipment,
    items: order.items.map(toItemView),
  };
}

export type CustomerOrder = NonNullable<Awaited<ReturnType<typeof getCustomerOrder>>>;
