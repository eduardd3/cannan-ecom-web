import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createUser, createVariant, resetDb, stockOf } from "../../../test/db";
import { adjustStockStandalone, checkStockConsistency } from "./adjust";
import { recordManualAdjustment } from "./manual-adjust";

async function lastAdjustment(variantId: number) {
  return prisma.inventoryAdjustment.findFirstOrThrow({
    where: { variantId },
    orderBy: { id: "desc" },
    select: { delta: true, stockAfter: true, reason: true, note: true, createdById: true },
  });
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("recordManualAdjustment", () => {
  it("records a restock as a positive delta by the admin", async () => {
    const admin = await createUser("ADMIN");
    const variant = await createVariant({ stock: 2 });

    const result = await recordManualAdjustment({
      variantId: variant.id,
      reason: "RESTOCK",
      amount: 5,
      createdById: admin.id,
    });

    expect(result).toEqual({ ok: true, stockAfter: 7 });
    expect(await lastAdjustment(variant.id)).toEqual({
      delta: 5,
      stockAfter: 7,
      reason: "RESTOCK",
      note: null,
      createdById: admin.id,
    });
  });

  it("records a channel sale as a negative delta with its note", async () => {
    const admin = await createUser("ADMIN");
    const variant = await createVariant({ stock: 4 });

    const result = await recordManualAdjustment({
      variantId: variant.id,
      reason: "CHANNEL_SALE_OTHER_PLATFORM",
      amount: 3,
      note: "Amazon 113-0000000-0000000",
      createdById: admin.id,
    });

    expect(result).toEqual({ ok: true, stockAfter: 1 });
    expect(await lastAdjustment(variant.id)).toMatchObject({ delta: -3, note: "Amazon 113-0000000-0000000" });
  });

  it("refuses a channel sale larger than stock and writes nothing", async () => {
    const admin = await createUser("ADMIN");
    const variant = await createVariant({ stock: 2 });

    const result = await recordManualAdjustment({
      variantId: variant.id,
      reason: "CHANNEL_SALE_OTHER_PLATFORM",
      amount: 3,
      note: "Walmart",
      createdById: admin.id,
    });

    expect(result).toMatchObject({ ok: false });
    expect(await stockOf(variant.id)).toBe(2);
    expect(await prisma.inventoryAdjustment.count({ where: { variantId: variant.id } })).toBe(1); // opening stock only
  });

  it("turns a recount into the difference from the books, down to zero", async () => {
    const admin = await createUser("ADMIN");
    const variant = await createVariant({ stock: 6 });

    expect(
      await recordManualAdjustment({ variantId: variant.id, reason: "MANUAL_RECOUNT", amount: 0, note: "Shelf empty", createdById: admin.id }),
    ).toEqual({ ok: true, stockAfter: 0 });
    expect(await lastAdjustment(variant.id)).toMatchObject({ delta: -6, stockAfter: 0, reason: "MANUAL_RECOUNT" });

    expect(
      await recordManualAdjustment({ variantId: variant.id, reason: "MANUAL_RECOUNT", amount: 0, note: "Again", createdById: admin.id }),
    ).toMatchObject({ ok: false, message: expect.stringMatching(/already 0/) });
    expect((await checkStockConsistency(variant.id))?.consistent).toBe(true);
  });

  it("computes a recount from stock as it stands after a concurrent sale commits", async () => {
    const admin = await createUser("ADMIN");
    const variant = await createVariant({ stock: 10 });

    // Both race for the row lock; whichever order they land in, the
    // counted total must be what's left at the end.
    await Promise.all([
      adjustStockStandalone({ variantId: variant.id, delta: -4, reason: "CHANNEL_SALE_OTHER_PLATFORM" }),
      recordManualAdjustment({ variantId: variant.id, reason: "MANUAL_RECOUNT", amount: 8, note: "Count", createdById: admin.id }),
    ]);

    const consistency = await checkStockConsistency(variant.id);
    expect(consistency?.consistent).toBe(true);
    // Recount first: 10 → 8, then the sale → 4. Sale first: 10 → 6, then the recount → 8.
    expect([4, 8]).toContain(consistency?.stock);
  });

  it("reports a missing variant", async () => {
    const admin = await createUser("ADMIN");
    expect(
      await recordManualAdjustment({ variantId: 999_999, reason: "RESTOCK", amount: 1, createdById: admin.id }),
    ).toEqual({ ok: false, message: "That variant no longer exists." });
  });
});
