// lib/cart/actions.ts
//
// The WRITE side. Every export from a "use server" file becomes a callable
// POST endpoint, so only export the actions themselves; keep helpers private
// or in another file.
"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import type { ProductStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { checkLimit, clientIp, guestCartAddLimiter, guestCartCreateLimiter } from "@/lib/rate-limit";
import { generateGuestToken, hashGuestToken, refreshGuestTokenCookie, setGuestTokenCookie } from "./guest-token";
import { cartOwnerWhere } from "./queries";
import { getCurrentCartOwner } from "./session";
import {
  MAX_QTY_PER_LINE,
  addToCartSchema,
  removeItemSchema,
  updateQuantitySchema,
} from "./schemas";
import type { ActionResult, CartErrorCode, CartOwner } from "./types";

function fail(error: CartErrorCode, message: string): { ok: false; error: CartErrorCode; message: string } {
  return { ok: false, error, message };
}

const UNAUTHENTICATED = () => fail("UNAUTHENTICATED", "Sign in to use your cart.");
const INVALID_INPUT = () => fail("INVALID_INPUT", "That request wasn't valid.");
const RATE_LIMITED = () => fail("RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.");
const UNKNOWN = () => fail("UNKNOWN", "Something went wrong. Please try again.");

// Same rule as getCartView in ./queries: draft/archived products and retired
// variants can sit in a cart but can't be bought.
function isPurchasable(variant: { isActive: boolean; product: { status: ProductStatus } }) {
  return variant.isActive && variant.product.status === "ACTIVE";
}

function cappedNotice(final: number, requested: number): string | undefined {
  return final < requested ? `Only ${final} available — quantity adjusted.` : undefined;
}

// Pruning (roadmap 4.6) deletes guest carts by Cart.updatedAt, but item
// changes write CartItem, not Cart, and Prisma doesn't bump @updatedAt on an
// empty update. So every action sets it, and a guest's cookie gets a fresh
// 30 days to match.
async function refreshGuestCookie(owner: CartOwner | null) {
  if (owner?.kind === "guest") await refreshGuestTokenCookie();
}

// ---------------------------------------------------------------------------
// addToCart
// ---------------------------------------------------------------------------

type CartTarget = CartOwner | { kind: "new-guest"; token: string };

// Which cart an add writes to. No owner, or a guest whose cart is gone
// (pruned, or a cookie from another environment), gets a fresh token, never a
// cart under the cookie's hash: the server only creates carts for tokens it
// generated itself.
async function cartTarget(owner: CartOwner | null): Promise<CartTarget> {
  if (owner?.kind === "user") return owner;
  if (owner) {
    const cart = await prisma.cart.findUnique({ where: { guestTokenHash: owner.tokenHash }, select: { id: true } });
    if (cart) return owner;
  }
  return { kind: "new-guest", token: generateGuestToken() };
}

/**
 * Adds a variant to the visitor's cart, or increases its quantity if the line
 * already exists. Creates the cart on first use: for a signed-out visitor
 * that's a guest cart plus its cookie, the only place the cookie is set.
 *
 * Stock here is a SOFT check: it caps the quantity so the UI is honest, but
 * doesn't reserve anything. The authoritative check happens at checkout.
 */
export async function addToCart(
  input: unknown,
): Promise<ActionResult<{ quantity: number }>> {
  const owner = await getCurrentCartOwner();

  const parsed = addToCartSchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT();
  const { variantId, quantity } = parsed.data;

  // Guests and cookieless visitors only, before any database work.
  const ip = owner?.kind === "user" ? null : clientIp(await headers());
  if (ip !== null && !(await checkLimit(guestCartAddLimiter, ip)).ok) return RATE_LIMITED();

  try {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { stock: true, isActive: true, product: { select: { status: true } } },
    });
    if (!variant || !isPurchasable(variant)) {
      return fail("VARIANT_NOT_FOUND", "That item isn't available.");
    }
    if (variant.stock <= 0) return fail("OUT_OF_STOCK", "That item is out of stock.");

    const target = await cartTarget(owner);
    if (target.kind === "new-guest" && ip !== null && !(await checkLimit(guestCartCreateLimiter, ip)).ok) {
      return RATE_LIMITED();
    }

    const { desired, final } = await prisma.$transaction(async (tx) => {
      const now = new Date();
      // userId is @unique, so concurrent first adds can't create two user
      // carts. Two cookieless first adds can create two guest carts; the
      // last Set-Cookie wins and pruning removes the other (accepted).
      const cart =
        target.kind === "user"
          ? await tx.cart.upsert({
              where: { userId: target.userId },
              create: { userId: target.userId },
              update: { updatedAt: now },
            })
          : target.kind === "guest"
            ? await tx.cart.update({ where: { guestTokenHash: target.tokenHash }, data: { updatedAt: now } })
            : await tx.cart.create({ data: { guestTokenHash: hashGuestToken(target.token) } });

      const existing = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId: cart.id, variantId } },
        select: { quantity: true },
      });

      const desired = (existing?.quantity ?? 0) + quantity;
      const final = Math.min(desired, variant.stock, MAX_QTY_PER_LINE);

      // SET, not increment: final is already capped against stock and the limit.
      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: cart.id, variantId } },
        create: { cartId: cart.id, variantId, quantity: final },
        update: { quantity: final },
      });

      return { desired, final };
    });

    // After the commit, so a failed add never hands out a cookie.
    if (target.kind === "new-guest") await setGuestTokenCookie(target.token);
    else await refreshGuestCookie(target);

    // The whole layout, not just /cart: the header's cart badge is on every page.
    revalidatePath("/", "layout");
    return { ok: true, data: { quantity: final }, notice: cappedNotice(final, desired) };
  } catch (error) {
    console.error("addToCart failed", error);
    return UNKNOWN();
  }
}

// ---------------------------------------------------------------------------
// updateCartItemQuantity
// ---------------------------------------------------------------------------

/**
 * Sets a line's quantity to an exact value (the +/- or dropdown on the cart page).
 */
export async function updateCartItemQuantity(
  input: unknown,
): Promise<ActionResult<{ quantity: number }>> {
  const owner = await getCurrentCartOwner();
  if (!owner) return UNAUTHENTICATED();

  const parsed = updateQuantitySchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT();
  const { itemId, quantity } = parsed.data;

  try {
    // Scoped to this owner's cart: someone else's item is indistinguishable
    // from a missing one, on purpose.
    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cart: cartOwnerWhere(owner) },
      select: {
        cartId: true,
        variant: {
          select: { stock: true, isActive: true, product: { select: { status: true } } },
        },
      },
    });
    if (!item) return fail("ITEM_NOT_FOUND", "That item is no longer in your cart.");

    const { variant } = item;
    // Same codes as addToCart.
    if (!isPurchasable(variant)) return fail("VARIANT_NOT_FOUND", "That item isn't available.");
    if (variant.stock <= 0) return fail("OUT_OF_STOCK", "That item is out of stock.");

    const final = Math.min(quantity, variant.stock, MAX_QTY_PER_LINE);
    // Update by id is safe now: ownership was proven above.
    await prisma.$transaction([
      prisma.cartItem.update({ where: { id: itemId }, data: { quantity: final } }),
      prisma.cart.update({ where: { id: item.cartId }, data: { updatedAt: new Date() } }),
    ]);
    await refreshGuestCookie(owner);

    revalidatePath("/", "layout"); // cart page and header badge
    return { ok: true, data: { quantity: final }, notice: cappedNotice(final, quantity) };
  } catch (error) {
    console.error("updateCartItemQuantity failed", error);
    return UNKNOWN();
  }
}

// ---------------------------------------------------------------------------
// removeCartItem
// ---------------------------------------------------------------------------

/**
 * Removes one line from the visitor's cart.
 */
export async function removeCartItem(input: unknown): Promise<ActionResult> {
  const owner = await getCurrentCartOwner();
  if (!owner) return UNAUTHENTICATED();

  const parsed = removeItemSchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT();

  try {
    const removed = await prisma.$transaction(async (tx) => {
      // deleteMany (not delete): it accepts the relation filter and returns
      // { count } instead of throwing when nothing matched.
      const { count } = await tx.cartItem.deleteMany({
        where: { id: parsed.data.itemId, cart: cartOwnerWhere(owner) },
      });
      if (count === 0) return false;
      await tx.cart.update({ where: cartOwnerWhere(owner), data: { updatedAt: new Date() } });
      return true;
    });
    if (!removed) return fail("ITEM_NOT_FOUND", "That item is no longer in your cart.");
    await refreshGuestCookie(owner);

    revalidatePath("/", "layout"); // cart page and header badge
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("removeCartItem failed", error);
    return UNKNOWN();
  }
}

// Note: there's deliberately no clearCart action. The cart is cleared by the
// Stripe webhook inside the order-creation transaction, not by the client.
