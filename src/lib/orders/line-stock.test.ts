import { describe, expect, it } from "vitest";

import { deductedByVariant, lineStock } from "./line-stock";

describe("deductedByVariant", () => {
  it("nets ORDER_PLACED against ORDER_CANCELED per variant", () => {
    const deducted = deductedByVariant([
      { variantId: 1, delta: -3, reason: "ORDER_PLACED" },
      { variantId: 2, delta: -1, reason: "ORDER_PLACED" },
      { variantId: 1, delta: 3, reason: "ORDER_CANCELED" },
    ]);
    expect(deducted.get(1)).toBe(0);
    expect(deducted.get(2)).toBe(1);
  });

  it("ignores reasons that aren't tied to an order", () => {
    expect(deductedByVariant([{ variantId: 1, delta: 5, reason: "RESTOCK" }]).size).toBe(0);
  });
});

describe("lineStock", () => {
  it("reports deducted and outstanding units, sorted by variantId", () => {
    const lines = lineStock(
      [
        { variantId: 9, quantity: 3 },
        { variantId: 4, quantity: 2 },
      ],
      [{ variantId: 4, delta: -2, reason: "ORDER_PLACED" }],
    );
    expect(lines).toEqual([
      { variantId: 4, quantity: 2, deducted: 2, outstanding: 0 },
      { variantId: 9, quantity: 3, deducted: 0, outstanding: 3 },
    ]);
  });

  it("treats a canceled line as outstanding again", () => {
    const [line] = lineStock(
      [{ variantId: 1, quantity: 2 }],
      [
        { variantId: 1, delta: -2, reason: "ORDER_PLACED" },
        { variantId: 1, delta: 2, reason: "ORDER_CANCELED" },
      ],
    );
    expect(line).toMatchObject({ deducted: 0, outstanding: 2 });
  });
});
