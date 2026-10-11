// lib/orders/line-stock.ts
//
// Pure functions, no database. Answers "how many units has this order
// actually taken from stock, per line?" from the order's ledger rows. Approve,
// refund, and the admin order page all read it the same way.

import type { InventoryReason } from "@/generated/prisma/client";

export type OrderLedgerRow = { variantId: number; delta: number; reason: InventoryReason };
export type OrderLine = { variantId: number; quantity: number };

export type LineStock = {
  variantId: number;
  quantity: number;
  deducted: number; // net units this order holds: ORDER_PLACED minus ORDER_CANCELED
  outstanding: number; // units ordered but never taken from stock
};

/**
 * Net units each variant has had deducted for this order. ORDER_PLACED rows
 * are negative and ORDER_CANCELED rows positive, so the deducted amount is
 * minus their sum. Other reasons never carry an orderId (rules.ts).
 */
export function deductedByVariant(rows: OrderLedgerRow[]): Map<number, number> {
  const deducted = new Map<number, number>();
  for (const row of rows) {
    if (row.reason !== "ORDER_PLACED" && row.reason !== "ORDER_CANCELED") continue;
    deducted.set(row.variantId, (deducted.get(row.variantId) ?? 0) - row.delta);
  }
  return deducted;
}

/** One entry per line, in ascending variantId order (the lock order adjustStock asks for). */
export function lineStock(lines: OrderLine[], rows: OrderLedgerRow[]): LineStock[] {
  const deducted = deductedByVariant(rows);
  return [...lines]
    .sort((a, b) => a.variantId - b.variantId)
    .map((line) => {
      const units = deducted.get(line.variantId) ?? 0;
      return {
        variantId: line.variantId,
        quantity: line.quantity,
        deducted: units,
        outstanding: Math.max(line.quantity - units, 0),
      };
    });
}
