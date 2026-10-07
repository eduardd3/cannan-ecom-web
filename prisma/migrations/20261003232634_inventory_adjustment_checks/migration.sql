-- Hand-written: CHECK constraints Prisma's schema language can't express.
-- These back up validateAdjustment in src/lib/inventory/rules.ts at the DB level.

-- An adjustment that moves nothing is a bug, not a ledger entry.
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_delta_check" CHECK ("delta" <> 0);

-- Mirrors ProductVariant_stock_check: the recorded running total can't be negative.
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_stockAfter_check" CHECK ("stockAfter" >= 0);

-- orderId is set exactly when the reason is order-linked. Must match
-- ORDER_LINKED_REASONS in rules.ts; adding an order-linked reason needs a migration.
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_order_reason_check"
  CHECK (("orderId" IS NOT NULL) = ("reason" IN ('ORDER_PLACED', 'ORDER_CANCELED')));
