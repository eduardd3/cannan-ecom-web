// lib/catalog/pagination.ts
//
// Which page numbers the collection page's controls show.

import { start } from "repl";

/** A page number, or a "…" standing in for two or more hidden pages. */
export type PageSlot = number | "gap";

/**
 * L4 · The page numbers to show for `current` of `total` pages, in `slots`
 * entries. Desktop uses 7 slots, mobile 5.
 *
 * - When total <= slots: every page, no gaps.
 * - Otherwise the result always has exactly `slots` entries, so the controls
 *   never change width.
 * - It always includes 1, total, and current.
 * - A gap never stands in for a single page: that page's number shows instead.
 *
 * | slots | total | current    | result          |
 * |-------|-------|------------|-----------------|
 * | 7     | 9     | 1, 2, 3, 4 | 1 2 3 4 5 … 9   |
 * | 7     | 9     | 5          | 1 … 4 5 6 … 9   |
 * | 7     | 9     | 6, 7, 8, 9 | 1 … 5 6 7 8 9   |
 * | 7     | 8     | 5          | 1 … 4 5 6 7 8   |
 * | 7     | 7     | 4          | 1 2 3 4 5 6 7   |
 * | 5     | 9     | 1, 2, 3    | 1 2 3 … 9       |
 * | 5     | 9     | 5          | 1 … 5 … 9       |
 * | 5     | 9     | 7, 8, 9    | 1 … 7 8 9       |
 * | 5     | 3     | 2          | 1 2 3           |
 * | any   | 1     | 1          | 1 (the page renders no controls) |
 */

function buildButtons(start: number, end: number): number[] {
  const arr: number[] = [];
  for (let i = start; i <= end; i++) {
    arr.push(i);
  }
  return arr;
}

export function pageWindow(current: number, total: number, slots: number): PageSlot[] {
  if (total <= slots) return buildButtons(1, total);

  // Middle shape: 1 … [window around current] … total. The 1, two gaps and
  // total take 4 slots; the window gets the rest, centered on current.
  const windowSize = slots - 4;
  const half = Math.floor(windowSize / 2);
  const first = current - half;
  const last = current + half;

  // A gap must hide at least 2 pages. The left gap hides 2 … first-1
  // (first - 2 pages); too few means current is near the start.
  if (first - 2 < 2) return [...buildButtons(1, slots - 2), "gap", total];

  // The right gap hides last+1 … total-1 (total - last - 1 pages).
  if (total - last - 1 < 2) return [1, "gap", ...buildButtons(total - (slots - 3), total)];

  return [1, "gap", ...buildButtons(first, last), "gap", total];
}
