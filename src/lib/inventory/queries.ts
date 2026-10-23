// lib/inventory/queries.ts
//
// Admin READ side for stock. Callers check requireStaff() first.
import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { formatVariantLabel } from "@/lib/catalog/format";
import { prisma } from "@/lib/prisma";
import { checkStockConsistency } from "./adjust";
import { LOW_STOCK_THRESHOLD } from "./rules";

export { LOW_STOCK_THRESHOLD };

export const STOCK_FILTERS = ["low", "out"] as const;
export type StockFilter = (typeof STOCK_FILTERS)[number];

export function parseStockFilter(value: unknown): StockFilter | null {
  return STOCK_FILTERS.find((filter) => filter === value) ?? null;
}

const FILTER_WHERE: Record<StockFilter, Prisma.ProductVariantWhereInput> = {
  low: { stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } },
  out: { stock: 0 },
};

export async function listInventory(filter: StockFilter | null) {
  const [variants, low, out, total] = await Promise.all([
    prisma.productVariant.findMany({
      where: filter ? FILTER_WHERE[filter] : undefined,
      orderBy: [{ product: { name: "asc" } }, { position: "asc" }, { id: "asc" }],
      select: {
        id: true,
        sku: true,
        option1Value: true,
        option2Value: true,
        stock: true,
        isActive: true,
        product: { select: { name: true, status: true, collection: { select: { name: true } } } },
      },
    }),
    prisma.productVariant.count({ where: FILTER_WHERE.low }),
    prisma.productVariant.count({ where: FILTER_WHERE.out }),
    prisma.productVariant.count(),
  ]);

  return {
    variants: variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      productName: variant.product.name,
      productStatus: variant.product.status,
      collectionName: variant.product.collection.name,
      variantLabel: formatVariantLabel(variant),
      stock: variant.stock,
      isActive: variant.isActive,
    })),
    counts: { low, out, total },
  };
}

// No pagination yet; the page says when history is cut off.
export const LEDGER_LIMIT = 200;

export async function getVariantInventory(variantId: number) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      sku: true,
      option1Value: true,
      option2Value: true,
      stock: true,
      isActive: true,
      amazonAsin: true,
      product: { select: { name: true, slug: true, status: true } },
      inventoryAdjustments: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: LEDGER_LIMIT,
        select: {
          id: true,
          createdAt: true,
          reason: true,
          delta: true,
          stockAfter: true,
          note: true,
          orderId: true,
          createdBy: { select: { email: true } },
        },
      },
    },
  });
  if (!variant) return null;

  const consistency = await checkStockConsistency(variantId);
  return {
    ...variant,
    variantLabel: formatVariantLabel(variant),
    ledgerConsistent: consistency?.consistent ?? false,
    ledgerSum: consistency?.ledgerSum ?? 0,
  };
}
