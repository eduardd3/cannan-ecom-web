import { describe, it } from "vitest";

// L4 (Lalo). The contract table is in pageWindow's doc comment in pagination.ts.

describe("pageWindow", () => {
  it.todo("7 slots, 9 pages, current 1, 2, 3, 4 → 1 2 3 4 5 … 9");
  it.todo("7 slots, 9 pages, current 5 → 1 … 4 5 6 … 9");
  it.todo("7 slots, 9 pages, current 6, 7, 8, 9 → 1 … 5 6 7 8 9");
  it.todo("7 slots, 8 pages, current 5 → 1 … 4 5 6 7 8");
  it.todo("7 slots, 7 pages, current 4 → 1 2 3 4 5 6 7");
  it.todo("5 slots, 9 pages, current 1, 2, 3 → 1 2 3 … 9");
  it.todo("5 slots, 9 pages, current 5 → 1 … 5 … 9");
  it.todo("5 slots, 9 pages, current 7, 8, 9 → 1 … 7 8 9");
  it.todo("5 slots, 3 pages, current 2 → 1 2 3");
  it.todo("any slots, 1 page → 1");
  it.todo("always exactly `slots` entries when total > slots");
  it.todo("a gap never stands in for a single page");
});
