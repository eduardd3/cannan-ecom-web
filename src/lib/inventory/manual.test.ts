import { describe, expect, it } from "vitest";

import { manualDelta, MAX_MANUAL_UNITS, parseManualReason } from "./manual";
import { validateAdjustment } from "./rules";

describe("manualDelta", () => {
  it("adds received units on a restock", () => {
    expect(manualDelta("RESTOCK", 6, 2)).toEqual({ ok: true, delta: 6 });
  });

  it("subtracts sold units on a channel sale", () => {
    expect(manualDelta("CHANNEL_SALE_OTHER_PLATFORM", 2, 5)).toEqual({ ok: true, delta: -2 });
    expect(manualDelta("CHANNEL_SALE_OTHER_PLATFORM", 5, 5)).toEqual({ ok: true, delta: -5 });
  });

  it("refuses a channel sale larger than current stock", () => {
    expect(manualDelta("CHANNEL_SALE_OTHER_PLATFORM", 6, 5)).toMatchObject({ ok: false, message: /Only 5 in stock/ });
  });

  it("turns a recount into the difference from current stock, either way", () => {
    expect(manualDelta("MANUAL_RECOUNT", 8, 5)).toEqual({ ok: true, delta: 3 });
    expect(manualDelta("MANUAL_RECOUNT", 0, 5)).toEqual({ ok: true, delta: -5 });
  });

  it("refuses a recount that matches current stock instead of writing a zero delta", () => {
    expect(manualDelta("MANUAL_RECOUNT", 5, 5)).toMatchObject({ ok: false, message: /already 5/ });
  });

  it("refuses zero for a restock or a sale", () => {
    expect(manualDelta("RESTOCK", 0, 5).ok).toBe(false);
    expect(manualDelta("CHANNEL_SALE_OTHER_PLATFORM", 0, 5).ok).toBe(false);
  });

  it("refuses negative, fractional, and oversized amounts", () => {
    expect(manualDelta("RESTOCK", -1, 5).ok).toBe(false);
    expect(manualDelta("RESTOCK", 1.5, 5).ok).toBe(false);
    expect(manualDelta("RESTOCK", MAX_MANUAL_UNITS + 1, 5).ok).toBe(false);
    expect(manualDelta("RESTOCK", Number.NaN, 5).ok).toBe(false);
  });

  it("only produces deltas that the ledger rules accept", () => {
    for (const [reason, amount, stock] of [
      ["RESTOCK", 3, 0],
      ["CHANNEL_SALE_OTHER_PLATFORM", 1, 4],
      ["MANUAL_RECOUNT", 9, 4],
      ["MANUAL_RECOUNT", 1, 4],
    ] as const) {
      const result = manualDelta(reason, amount, stock);
      if (!result.ok) throw new Error(result.message);
      expect(validateAdjustment(result.delta, reason, null)).toBeNull();
    }
  });
});

describe("parseManualReason", () => {
  it("accepts only the reasons an admin may record", () => {
    expect(parseManualReason("RESTOCK")).toBe("RESTOCK");
    expect(parseManualReason("ORDER_PLACED")).toBeNull();
    expect(parseManualReason("INITIAL_STOCK")).toBeNull();
    expect(parseManualReason(null)).toBeNull();
  });
});
