// lib/inventory/adjust.ts
//
// The ONLY code allowed to change ProductVariant.stock. Every caller (admin
// restock form, Stripe webhook, future channel sync) goes through here, so
// every stock change gets a ledger row.
import "server-only";

import { Prisma, type InventoryReason } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { validateAdjustment } from "./rules";

export type AdjustStockInput = {
  variantId: number;
  delta: number; // signed; see rules.ts for which sign each reason allows
  reason: InventoryReason;
  note?: string;
  orderId?: number; // required for ORDER_* reasons, forbidden otherwise
  createdById?: number; // omit (null) when the system makes the change
};

// Expected outcomes are values. A shortfall is NORMAL in this business
// (an item sells on Amazon or Walmart mid-checkout), so the webhook needs to see it and
// decide what to do, not catch an exception.
export type AdjustStockResult =
  | { ok: true; adjustmentId: number; stockAfter: number }
  | { ok: false; reason: "INSUFFICIENT_STOCK"; available: number }
  | { ok: false; reason: "VARIANT_NOT_FOUND" };

// ---------------------------------------------------------------------------
// Core: runs inside a transaction the CALLER owns
// ---------------------------------------------------------------------------

/**
 * Applies one stock change and records it in the ledger, atomically.
 *
 * Takes a transaction client instead of opening its own transaction, so it
 * can be one step inside a bigger transaction (the webhook creates the order,
 * adjusts stock for each line, and clears the cart, all or nothing).
 *
 * Never lets stock go below 0. A decrement larger than current stock changes
 * nothing and returns INSUFFICIENT_STOCK.
 *
 * The update row-locks the variant until the caller's transaction ends. When
 * adjusting several variants in one transaction, go in ascending variantId
 * order so two concurrent orders can't deadlock on each other's rows.
 */
export async function adjustStock(
  tx: Prisma.TransactionClient,
  input: AdjustStockInput,
): Promise<AdjustStockResult> {
  const problem = validateAdjustment(input.delta, input.reason, input.orderId);
  if (problem) throw new Error(`adjustStock: ${problem}`);

  // Conditional and atomic: the stock guard and the increment are one UPDATE,
  // so a concurrent decrement can't slip in between a check and a write.
  // updateMany (not raw SQL) so @updatedAt is still bumped.
  const { count } = await tx.productVariant.updateMany({
    where: { id: input.variantId, stock: { gte: -input.delta } },
    data: { stock: { increment: input.delta } },
  });

  if (count === 0) {
    const variant = await tx.productVariant.findUnique({
      where: { id: input.variantId },
      select: { stock: true },
    });
    if (!variant) return { ok: false, reason: "VARIANT_NOT_FOUND" };
    return { ok: false, reason: "INSUFFICIENT_STOCK", available: variant.stock };
  }

  // We hold the row lock from the update, so this reads exactly our result.
  const { stock: stockAfter } = await tx.productVariant.findUniqueOrThrow({
    where: { id: input.variantId },
    select: { stock: true },
  });

  const adjustment = await tx.inventoryAdjustment.create({
    data: {
      variantId: input.variantId,
      delta: input.delta,
      stockAfter,
      reason: input.reason,
      note: input.note ?? null,
      orderId: input.orderId ?? null,
      createdById: input.createdById ?? null,
    },
    select: { id: true },
  });

  return { ok: true, adjustmentId: adjustment.id, stockAfter };
}

// ---------------------------------------------------------------------------
// Convenience: for callers that need ONLY this one change (admin forms)
// ---------------------------------------------------------------------------

/**
 * Wraps adjustStock in its own transaction. Use this from admin actions.
 * Never call it from inside another transaction: Prisma doesn't nest
 * interactive transactions, so it would run separately and break atomicity.
 */
export async function adjustStockStandalone(
  input: AdjustStockInput,
): Promise<AdjustStockResult> {
  return prisma.$transaction((tx) => adjustStock(tx, input));
}

// ---------------------------------------------------------------------------
// Verification: does the cached total still match the ledger?
// ---------------------------------------------------------------------------

/**
 * Compares ProductVariant.stock with the sum of its ledger deltas.
 * Read-only. Useful in the admin history view and in tests: if this ever
 * returns a mismatch, something changed stock without going through adjustStock.
 *
 * Assumes variants are created with stock 0 and their opening count is an
 * INITIAL_STOCK adjustment; a variant created with stock > 0 reads as a mismatch.
 */
export async function checkStockConsistency(variantId: number): Promise<{
  stock: number;
  ledgerSum: number;
  consistent: boolean;
} | null> {
  // REPEATABLE READ gives both reads one snapshot. Under the default READ
  // COMMITTED, an adjustment committing between them would fake a mismatch.
  const [variant, aggregate] = await prisma.$transaction(
    [
      prisma.productVariant.findUnique({ where: { id: variantId }, select: { stock: true } }),
      prisma.inventoryAdjustment.aggregate({ where: { variantId }, _sum: { delta: true } }),
    ],
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  if (!variant) return null;

  const ledgerSum = aggregate._sum.delta ?? 0;
  return { stock: variant.stock, ledgerSum, consistent: variant.stock === ledgerSum };
}