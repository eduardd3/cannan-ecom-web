import { describe, expect, it } from "vitest";

import { pageWindow, type PageSlot } from "./pagination";

// L4 (Lalo). The contract table is in pageWindow's doc comment in pagination.ts.

const gap = "gap" as const;

describe("pageWindow", () => {
  it("7 slots, 9 pages, current 1, 2, 3, 4 → 1 2 3 4 5 … 9", () => {
    for (const current of [1, 2, 3, 4]) {
      expect(pageWindow(current, 9, 7), `current ${current}`).toEqual([1, 2, 3, 4, 5, gap, 9]);
    }
  });

  it("7 slots, 9 pages, current 5 → 1 … 4 5 6 … 9", () => {
    expect(pageWindow(5, 9, 7)).toEqual([1, gap, 4, 5, 6, gap, 9]);
  });

  it("7 slots, 9 pages, current 6, 7, 8, 9 → 1 … 5 6 7 8 9", () => {
    for (const current of [6, 7, 8, 9]) {
      expect(pageWindow(current, 9, 7), `current ${current}`).toEqual([1, gap, 5, 6, 7, 8, 9]);
    }
  });

  it("7 slots, 8 pages, current 5 → 1 … 4 5 6 7 8", () => {
    expect(pageWindow(5, 8, 7)).toEqual([1, gap, 4, 5, 6, 7, 8]);
  });

  it("7 slots, 7 pages, current 4 → 1 2 3 4 5 6 7", () => {
    expect(pageWindow(4, 7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("5 slots, 9 pages, current 1, 2, 3 → 1 2 3 … 9", () => {
    for (const current of [1, 2, 3]) {
      expect(pageWindow(current, 9, 5), `current ${current}`).toEqual([1, 2, 3, gap, 9]);
    }
  });

  it("5 slots, 9 pages, current 5 → 1 … 5 … 9", () => {
    expect(pageWindow(5, 9, 5)).toEqual([1, gap, 5, gap, 9]);
  });

  it("5 slots, 9 pages, current 7, 8, 9 → 1 … 7 8 9", () => {
    for (const current of [7, 8, 9]) {
      expect(pageWindow(current, 9, 5), `current ${current}`).toEqual([1, gap, 7, 8, 9]);
    }
  });

  it("5 slots, 3 pages, current 2 → 1 2 3", () => {
    expect(pageWindow(2, 3, 5)).toEqual([1, 2, 3]);
  });

  it("any slots, 1 page → 1", () => {
    expect(pageWindow(1, 1, 5)).toEqual([1]);
    expect(pageWindow(1, 1, 7)).toEqual([1]);
  });

  // The remaining two sweep every page of collections up to 60 pages, so they
  // catch a rule that holds for the table's 9 pages but breaks on bigger ones.
  const sweep: { slots: number; total: number; current: number; result: PageSlot[] }[] = [];
  for (const slots of [5, 7]) {
    for (let total = slots + 1; total <= 60; total++) {
      for (let current = 1; current <= total; current++) {
        sweep.push({ slots, total, current, result: pageWindow(current, total, slots) });
      }
    }
  }

  it("always exactly `slots` entries when total > slots", () => {
    for (const { slots, total, current, result } of sweep) {
      const label = `current ${current}, total ${total}, slots ${slots}`;
      expect(result, label).toHaveLength(slots);
      expect(result, label).toContain(1);
      expect(result, label).toContain(total);
      expect(result, label).toContain(current);
    }
  });

  it("a gap never stands in for a single page", () => {
    for (const { slots, total, current, result } of sweep) {
      result.forEach((slot, i) => {
        if (slot !== gap) return;
        // The pages on either side of a gap are at least 3 apart, so it hides 2 or more.
        const before = result[i - 1] as number;
        const after = result[i + 1] as number;
        expect(after - before, `current ${current}, total ${total}, slots ${slots}`).toBeGreaterThanOrEqual(3);
      });
    }
  });
});
