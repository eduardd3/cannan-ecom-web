// lib/inventory/manual.ts
//
// Pure rules for the admin stock form. No server imports: the form (a client
// component) uses the labels, and the server action uses manualDelta.

import type { InventoryReason } from "@/generated/prisma/enums";

export const REASON_LABEL: Record<InventoryReason, string> = {
  INITIAL_STOCK: "Opening stock",
  RESTOCK: "Restock",
  MANUAL_RECOUNT: "Recount",
  CHANNEL_SALE_OTHER_PLATFORM: "Sold on another channel",
  ORDER_PLACED: "Order placed",
  ORDER_CANCELED: "Order canceled",
};

// What an admin can record by hand. INITIAL_STOCK belongs to variant
// creation; ORDER_* reasons come from checkout and review.
export const MANUAL_REASONS = ["RESTOCK", "CHANNEL_SALE_OTHER_PLATFORM", "MANUAL_RECOUNT"] as const;
export type ManualReason = (typeof MANUAL_REASONS)[number];

export function parseManualReason(value: unknown): ManualReason | null {
  return MANUAL_REASONS.find((reason) => reason === value) ?? null;
}

// The number field means something different per reason, so the form
// relabels it. Every entry is a non-negative whole number; the sign comes
// from the reason.
export const AMOUNT_LABEL: Record<ManualReason, string> = {
  RESTOCK: "Units received",
  CHANNEL_SALE_OTHER_PLATFORM: "Units sold",
  MANUAL_RECOUNT: "Units counted on hand",
};

// A recount or a channel sale has to say where the number came from.
export const NOTE_REQUIRED: ReadonlySet<ManualReason> = new Set<ManualReason>([
  "MANUAL_RECOUNT",
  "CHANNEL_SALE_OTHER_PLATFORM",
]);

export const MAX_MANUAL_UNITS = 10_000;

export type ManualDeltaResult = { ok: true; delta: number } | { ok: false; message: string };

/**
 * Turns what the admin typed into a signed ledger delta.
 *
 * `currentStock` matters only for a recount, where `amount` is the counted
 * total rather than a change. Read it under a row lock, or a sale landing
 * between the read and the write makes the recount wrong.
 */
export function manualDelta(reason: ManualReason, amount: number, currentStock: number): ManualDeltaResult {
  if (!Number.isInteger(amount) || amount < 0 || amount > MAX_MANUAL_UNITS) {
    return { ok: false, message: `Enter a whole number from 0 to ${MAX_MANUAL_UNITS.toLocaleString("en-US")}.` };
  }

  switch (reason) {
    case "RESTOCK":
      if (amount === 0) return { ok: false, message: "Enter at least 1 unit received." };
      return { ok: true, delta: amount };
    case "CHANNEL_SALE_OTHER_PLATFORM":
      if (amount === 0) return { ok: false, message: "Enter at least 1 unit sold." };
      if (amount > currentStock) {
        return { ok: false, message: `Only ${currentStock} in stock; record a recount if the books are off.` };
      }
      return { ok: true, delta: -amount };
    case "MANUAL_RECOUNT":
      if (amount === currentStock) return { ok: false, message: `Stock is already ${currentStock}; nothing to change.` };
      return { ok: true, delta: amount - currentStock };
  }
}
