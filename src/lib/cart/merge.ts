// lib/cart/merge.ts
//
// Moves a guest cart into the account on customer sign-in. Called from
// Auth.js events.signIn (lib/auth-actions.ts), which runs inside the
// authCustomer server action, so the guest cookie can be read and cleared.
import "server-only";

import { prisma } from "@/lib/prisma";
import { clearGuestTokenCookie, hasGuestCookie, hashGuestToken, readGuestToken } from "./guest-token";
import { mergeCartLines } from "./merge-lines";
import { MAX_QTY_PER_LINE } from "./schemas";

/**
 * Merges the browser's guest cart into userId's cart, then clears the cookie.
 *
 * - No user cart: the guest cart is re-owned in one UPDATE (userId set,
 *   guestTokenHash cleared, so Cart_owner_check holds) and its lines capped.
 * - A user cart: guest quantities are added to it, capped, and the guest
 *   cart is deleted (its items cascade).
 *
 * Never throws: a failed merge must not block sign-in. The guest cart and
 * cookie stay; signed in wins (getCurrentCartOwner), so the cart simply stops
 * showing, and pruning removes it later.
 */
export async function mergeGuestCart(userId: number): Promise<void> {
  try {
    if (!(await hasGuestCookie())) return;
    const token = await readGuestToken();
    if (token) await mergeInto(userId, hashGuestToken(token));
    await clearGuestTokenCookie();
  } catch (error) {
    // The error only: never the token or its hash.
    console.error("mergeGuestCart failed", error instanceof Error ? error.message : error);
  }
}

async function mergeInto(userId: number, guestTokenHash: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const guest = await tx.cart.findUnique({
      where: { guestTokenHash },
      select: { id: true, items: { select: { variantId: true, quantity: true, variant: { select: { stock: true } } } } },
    });
    if (!guest) return;

    const guestLines = guest.items.map(({ variantId, quantity }) => ({ variantId, quantity }));
    const stockByVariant = new Map(guest.items.map((item) => [item.variantId, item.variant.stock]));
    const now = new Date();

    const userCart = await tx.cart.findUnique({
      where: { userId },
      select: { id: true, items: { select: { variantId: true, quantity: true } } },
    });

    if (!userCart) {
      await tx.cart.update({
        where: { id: guest.id },
        data: { userId, guestTokenHash: null, updatedAt: now },
      });
      const capped = new Map(
        mergeCartLines([], guestLines, stockByVariant, MAX_QTY_PER_LINE).map((line) => [line.variantId, line.quantity]),
      );
      for (const { variantId, quantity } of guestLines) {
        const where = { cartId_variantId: { cartId: guest.id, variantId } };
        const final = capped.get(variantId);
        if (final === undefined) await tx.cartItem.delete({ where });
        else if (final !== quantity) await tx.cartItem.update({ where, data: { quantity: final } });
      }
      return;
    }

    for (const { variantId, quantity } of mergeCartLines(userCart.items, guestLines, stockByVariant, MAX_QTY_PER_LINE)) {
      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: userCart.id, variantId } },
        create: { cartId: userCart.id, variantId, quantity },
        update: { quantity },
      });
    }
    await tx.cart.update({ where: { id: userCart.id }, data: { updatedAt: now } });
    await tx.cart.delete({ where: { id: guest.id } });
  });
}
