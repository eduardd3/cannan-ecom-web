import { describe, expect, it } from "vitest";

import { mergeCartLines } from "./merge-lines";
import { MAX_QTY_PER_LINE } from "./schemas";

const stock = (entries: [number, number][]) => new Map(entries);

describe("mergeCartLines", () => {
  it("copies guest lines that don't overlap, and leaves user-only lines out", () => {
    const result = mergeCartLines(
      [{ variantId: 1, quantity: 2 }],
      [{ variantId: 2, quantity: 3 }],
      stock([[1, 50], [2, 50]]),
      MAX_QTY_PER_LINE,
    );
    expect(result).toEqual([{ variantId: 2, quantity: 3 }]);
  });

  it("sums a variant both carts have", () => {
    const result = mergeCartLines(
      [{ variantId: 1, quantity: 2 }],
      [{ variantId: 1, quantity: 3 }],
      stock([[1, 50]]),
      MAX_QTY_PER_LINE,
    );
    expect(result).toEqual([{ variantId: 1, quantity: 5 }]);
  });

  it("caps the sum at stock", () => {
    const result = mergeCartLines(
      [{ variantId: 1, quantity: 2 }],
      [{ variantId: 1, quantity: 3 }],
      stock([[1, 4]]),
      MAX_QTY_PER_LINE,
    );
    expect(result).toEqual([{ variantId: 1, quantity: 4 }]);
  });

  it("caps the sum at the per-line maximum", () => {
    const result = mergeCartLines(
      [{ variantId: 1, quantity: 7 }],
      [{ variantId: 1, quantity: 6 }],
      stock([[1, 50]]),
      MAX_QTY_PER_LINE,
    );
    expect(result).toEqual([{ variantId: 1, quantity: MAX_QTY_PER_LINE }]);
  });

  it("with zero stock, keeps the user's line as it is and adds no new line", () => {
    const result = mergeCartLines(
      [{ variantId: 1, quantity: 2 }],
      [
        { variantId: 1, quantity: 3 },
        { variantId: 2, quantity: 1 },
      ],
      stock([[1, 0], [2, 0]]),
      MAX_QTY_PER_LINE,
    );
    expect(result).toEqual([{ variantId: 1, quantity: 2 }]);
  });

  it("treats a variant missing from the stock map as zero stock", () => {
    expect(mergeCartLines([], [{ variantId: 9, quantity: 1 }], stock([]), MAX_QTY_PER_LINE)).toEqual([]);
  });
});
