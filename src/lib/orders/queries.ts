// lib/orders/queries.ts
//
// Admin READ side for orders. Callers check requireStaff() first.
import "server-only";

import type { OrderStatus } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { lineStock } from "./line-stock";

export const ORDER_STATUSES: readonly OrderStatus[] = ["NEEDS_REVIEW", "PAID", "FULFILLED", "REFUNDED", "CANCELED"];

export function parseOrderStatus(value: unknown): OrderStatus | null {
  return ORDER_STATUSES.find((status) => status === value) ?? null;
}

// No pagination yet; the list says when it's cut off.
export const ORDER_LIST_LIMIT = 100;

export async function listOrders(status: OrderStatus | null) {
  const [orders, counts] = await Promise.all([
    prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: ORDER_LIST_LIMIT,
      select: {
        id: true,
        createdAt: true,
        status: true,
        email: true,
        subtotalCents: true,
        shippingCents: true,
        taxCents: true,
        refundedCents: true,
        disputeStatus: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countByStatus = new Map(counts.map((row) => [row.status, row._count._all]));
  return {
    orders: orders.map((order) => ({
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      email: order.email,
      totalCents: order.subtotalCents + order.shippingCents + order.taxCents,
      refundedCents: order.refundedCents,
      disputeStatus: order.disputeStatus,
      lineCount: order._count.items,
    })),
    countByStatus,
    total: counts.reduce((sum, row) => sum + row._count._all, 0),
  };
}

export async function countOrdersNeedingReview(): Promise<number> {
  return prisma.order.count({ where: { status: "NEEDS_REVIEW" } });
}

export async function getOrderDetail(orderId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { email: true, name: true } },
      reviewResolvedBy: { select: { email: true } },
      fulfilledBy: { select: { email: true } },
      trackingUpdatedBy: { select: { email: true } },
      items: {
        orderBy: { id: "asc" },
        include: {
          variant: { select: { stock: true, product: { select: { slug: true } } } },
        },
      },
      inventoryAdjustments: {
        orderBy: { createdAt: "asc" },
        include: { createdBy: { select: { email: true } } },
      },
    },
  });
  if (!order) return null;

  const stockByVariant = new Map(lineStock(order.items, order.inventoryAdjustments).map((l) => [l.variantId, l]));
  return {
    ...order,
    totalCents: order.subtotalCents + order.shippingCents + order.taxCents,
    items: order.items.map((item) => {
      const stock = stockByVariant.get(item.variantId)!;
      return {
        id: item.id,
        variantId: item.variantId,
        productName: item.productName,
        productSlug: item.variant.product.slug,
        variantLabel: item.variantLabel,
        sku: item.sku,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
        deducted: stock.deducted,
        outstanding: stock.outstanding,
        stockNow: item.variant.stock,
      };
    }),
  };
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderDetail>>>;
