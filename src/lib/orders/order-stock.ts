// lib/orders/order-stock.ts
//
// Stock moves tied to one order, inside a transaction the caller owns.
// Review approval, review refunds, and Stripe refund/dispute events all read
// an order's lines the same way, so they all put back the same units.
import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { adjustStock } from "@/lib/inventory/adjust";
import { lineStock } from "./line-stock";

/** The order's lines with what each has taken from stock, in ascending variantId (lock) order. */
export async function orderLines(tx: Prisma.TransactionClient, orderId: number) {
  const [items, rows] = await Promise.all([
    tx.orderItem.findMany({ where: { orderId }, select: { variantId: true, quantity: true, sku: true } }),
    tx.inventoryAdjustment.findMany({ where: { orderId }, select: { variantId: true, delta: true, reason: true } }),
  ]);
  const skus = new Map(items.map((item) => [item.variantId, item.sku]));
  return lineStock(items, rows).map((line) => ({ ...line, sku: skus.get(line.variantId)! }));
}

/**
 * Puts back (ORDER_CANCELED) every unit this order actually took. Lines that
 * were never deducted (short at checkout) are skipped, and a line already put
 * back reads as 0 deducted, so calling this twice writes nothing the second
 * time. Only for orders whose goods are still on the shelf (not shipped).
 * Returns the number of units put back.
 */
export async function restockDeducted(
  tx: Prisma.TransactionClient,
  orderId: number,
  { createdById, note }: { createdById?: number; note: string },
): Promise<number> {
  let units = 0;
  for (const line of await orderLines(tx, orderId)) {
    if (line.deducted === 0) continue;
    const result = await adjustStock(tx, {
      variantId: line.variantId,
      delta: line.deducted,
      reason: "ORDER_CANCELED",
      orderId,
      createdById,
      note,
    });
    // An increment only fails if the variant is gone, which Restrict prevents.
    if (!result.ok) throw new Error(`Restock of variant ${line.variantId} on order ${orderId} failed`);
    units += line.deducted;
  }
  return units;
}
