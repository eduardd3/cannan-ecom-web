// lib/inventory/manual-adjust.ts
//
// Records a stock change an admin entered by hand (restock, recount, sale on
// another channel). Still goes through adjustStock, so it gets a ledger row.
import "server-only";

import { prisma } from "@/lib/prisma";
import { adjustStock } from "./adjust";
import { manualDelta, type ManualReason } from "./manual";

export type ManualAdjustmentInput = {
  variantId: number;
  reason: ManualReason;
  amount: number; // as typed: units received, units sold, or units counted
  note?: string;
  createdById: number;
};

export type ManualAdjustmentResult = { ok: true; stockAfter: number } | { ok: false; message: string };

export async function recordManualAdjustment(input: ManualAdjustmentInput): Promise<ManualAdjustmentResult> {
  return prisma.$transaction(async (tx) => {
    // Lock the row before reading stock: a recount's delta is computed from
    // it, and a checkout committing in between would make that delta stale.
    const [variant] = await tx.$queryRaw<{ stock: number }[]>`
      SELECT "stock" FROM "ProductVariant" WHERE "id" = ${input.variantId} FOR UPDATE`;
    if (!variant) return { ok: false, message: "That variant no longer exists." };

    const delta = manualDelta(input.reason, input.amount, variant.stock);
    if (!delta.ok) return delta;

    const result = await adjustStock(tx, {
      variantId: input.variantId,
      delta: delta.delta,
      reason: input.reason,
      note: input.note,
      createdById: input.createdById,
    });
    // Unreachable while we hold the lock, but adjustStock reports it as a value.
    if (!result.ok) return { ok: false, message: "Stock changed while saving. Try again." };

    return { ok: true, stockAfter: result.stockAfter };
  });
}
