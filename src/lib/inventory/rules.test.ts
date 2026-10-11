import { describe, expect, it } from "vitest";

import { REASON_DIRECTION, validateAdjustment } from "./rules";

describe("validateAdjustment", () => {
  it("accepts a valid entry for every reason", () => {
    expect(validateAdjustment(5, "INITIAL_STOCK", null)).toBeNull();
    expect(validateAdjustment(5, "RESTOCK", undefined)).toBeNull();
    expect(validateAdjustment(-1, "CHANNEL_SALE_OTHER_PLATFORM", null)).toBeNull();
    expect(validateAdjustment(-2, "MANUAL_RECOUNT", null)).toBeNull();
    expect(validateAdjustment(2, "MANUAL_RECOUNT", null)).toBeNull();
    expect(validateAdjustment(-1, "ORDER_PLACED", 10)).toBeNull();
    expect(validateAdjustment(1, "ORDER_CANCELED", 10)).toBeNull();
  });

  it("rejects a zero or fractional delta", () => {
    expect(validateAdjustment(0, "MANUAL_RECOUNT", null)).toMatch(/must not be 0/);
    expect(validateAdjustment(1.5, "RESTOCK", null)).toMatch(/integer/);
  });

  it("rejects a delta in the wrong direction for its reason", () => {
    expect(validateAdjustment(-1, "RESTOCK", null)).toMatch(/positive/);
    expect(validateAdjustment(-1, "ORDER_CANCELED", 10)).toMatch(/positive/);
    expect(validateAdjustment(1, "ORDER_PLACED", 10)).toMatch(/negative/);
    expect(validateAdjustment(1, "CHANNEL_SALE_OTHER_PLATFORM", null)).toMatch(/negative/);
  });

  it("requires an orderId for order reasons and forbids it for the rest", () => {
    expect(validateAdjustment(-1, "ORDER_PLACED", null)).toMatch(/requires an orderId/);
    expect(validateAdjustment(1, "ORDER_CANCELED", undefined)).toMatch(/requires an orderId/);
    expect(validateAdjustment(1, "RESTOCK", 10)).toMatch(/must not have an orderId/);
  });

  it("assigns a direction to every reason", () => {
    for (const direction of Object.values(REASON_DIRECTION)) {
      expect(["in", "out", "either"]).toContain(direction);
    }
  });
});
