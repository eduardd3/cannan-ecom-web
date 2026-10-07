// lib/inventory/rules.ts
//
// Pure functions, no database. These encode what a "valid" ledger entry looks
// like, so adjustStock can reject nonsense before it reaches Postgres, and so
// the rules can be unit tested without a DB.

import type { InventoryReason } from "@/generated/prisma/client";

// Which direction each reason is allowed to move stock.
//   "in"   → delta must be > 0
//   "out"  → delta must be < 0
//   "either" → any nonzero delta
export type DeltaDirection = "in" | "out" | "either";

// Typing it as Record<InventoryReason, ...> means adding a new enum value
// later is a compile error here until you decide its direction.
export const REASON_DIRECTION: Record<InventoryReason, DeltaDirection> = {
  INITIAL_STOCK: "in",
  RESTOCK: "in",
  ORDER_CANCELED: "in", // canceled order puts its units back
  ORDER_PLACED: "out",
  CHANNEL_SALE_OTHER_PLATFORM: "out",
  MANUAL_RECOUNT: "either", // count can come in above or below the books
};

// Reasons that must point at an Order. Every other reason must have none.
// Also enforced by InventoryAdjustment_order_reason_check; change both together.
export const ORDER_LINKED_REASONS: ReadonlySet<InventoryReason> = new Set<InventoryReason>([
  "ORDER_PLACED",
  "ORDER_CANCELED",
]);

/**
 * Returns null if the entry is valid, or a message describing what's wrong.
 * A message here means a bug in the CALLER, not a user error, which is why
 * adjustStock throws on it rather than returning a result.
 */
export function validateAdjustment(
  delta: number,
  reason: InventoryReason,
  orderId: number | null | undefined,
): string | null {
  if (!Number.isInteger(delta)) return `delta must be an integer, got ${delta}`;
  // InventoryAdjustment_delta_check also enforces this; here for a clearer message.
  if (delta === 0) return "delta must not be 0";

  const direction = REASON_DIRECTION[reason];
  if (direction === "in" && delta < 0) return `${reason} must have a positive delta, got ${delta}`;
  if (direction === "out" && delta > 0) return `${reason} must have a negative delta, got ${delta}`;

  const hasOrder = orderId != null;
  const needsOrder = ORDER_LINKED_REASONS.has(reason);
  if (needsOrder && !hasOrder) return `${reason} requires an orderId`;
  if (!needsOrder && hasOrder) return `${reason} must not have an orderId`;

  return null;
}
