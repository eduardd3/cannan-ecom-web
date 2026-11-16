// lib/catalog/pagination.ts
//
// Which page numbers the collection page's controls show.

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
export function pageWindow(current: number, total: number, slots: number): PageSlot[] {
  throw new Error("TODO(Lalo): L4 pageWindow");
}
