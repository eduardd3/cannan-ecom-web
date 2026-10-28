// lib/cart/merge-lines.ts
//
// The arithmetic of merging a guest cart into a user's cart on sign-in. Pure,
// so it's unit-tested without a database; lib/cart/merge.ts does the writes.

export type MergeLine = { variantId: number; quantity: number };

/**
 * The quantity each guest variant ends up with in the user's cart.
 *
 * Each result is min(user + guest, stock, max). A variant with no stock keeps
 * the user's current line as it is, or gets no line when the user had none;
 * it's left out of the result in that case. Purchasability isn't checked
 * here: inactive or archived lines carry over and the cart page flags them.
 * User lines for variants the guest didn't have aren't touched, so they're
 * not in the result.
 */
export function mergeCartLines(
  userLines: MergeLine[],
  guestLines: MergeLine[],
  stockByVariant: ReadonlyMap<number, number>,
  max: number,
): MergeLine[] {
  const userQuantity = new Map(userLines.map((line) => [line.variantId, line.quantity]));
  const result: MergeLine[] = [];
  for (const { variantId, quantity } of guestLines) {
    const current = userQuantity.get(variantId) ?? 0;
    const stock = Math.max(stockByVariant.get(variantId) ?? 0, 0);
    const capped = Math.min(current + quantity, stock, max);
    if (capped > 0) result.push({ variantId, quantity: capped });
    else if (current > 0) result.push({ variantId, quantity: current });
  }
  return result;
}
