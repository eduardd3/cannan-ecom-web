// lib/cart/actions.ts
//
// The WRITE side. Every export from a "use server" file becomes a callable
// POST endpoint, so only export the actions themselves; keep helpers private
// or in another file.
"use server";

import { revalidatePath } from "next/cache";

import type { ProductStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "./session";
import {
  MAX_QTY_PER_LINE,
  addToCartSchema,
  removeItemSchema,
  updateQuantitySchema,
} from "./schemas";
import type { ActionResult, CartErrorCode } from "./types";

function fail(error: CartErrorCode, message: string): { ok: false; error: CartErrorCode; message: string } {
  return { ok: false, error, message };
}

const UNAUTHENTICATED = () => fail("UNAUTHENTICATED", "Sign in to use your cart.");
const INVALID_INPUT = () => fail("INVALID_INPUT", "That request wasn't valid.");
const UNKNOWN = () => fail("UNKNOWN", "Something went wrong. Please try again.");

// Same rule as getCartView in ./queries: draft/archived products and retired
// variants can sit in a cart but can't be bought.
function isPurchasable(variant: { isActive: boolean; product: { status: ProductStatus } }) {
  return variant.isActive && variant.product.status === "ACTIVE";
}

function cappedNotice(final: number, requested: number): string | undefined {
  return final < requested ? `Only ${final} available — quantity adjusted.` : undefined;
}

// ---------------------------------------------------------------------------
// addToCart
// ---------------------------------------------------------------------------

/**
 * Adds a variant to the user's cart, or increases its quantity if the line
 * already exists. Creates the cart on first use.
 *
 * Stock here is a SOFT check: it caps the quantity so the UI is honest, but
 * doesn't reserve anything. The authoritative check happens at checkout.
 */
export async function addToCart(
  input: unknown,
): Promise<ActionResult<{ quantity: number }>> {
  const userId = await getCurrentUserId();
  if (!userId) return UNAUTHENTICATED();

  const parsed = addToCartSchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT();
  const { variantId, quantity } = parsed.data;

  try {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { stock: true, isActive: true, product: { select: { status: true } } },
    });
    if (!variant || !isPurchasable(variant)) {
      return fail("VARIANT_NOT_FOUND", "That item isn't available.");
    }
    if (variant.stock <= 0) return fail("OUT_OF_STOCK", "That item is out of stock.");

    const { desired, final } = await prisma.$transaction(async (tx) => {
      // userId is @unique, so concurrent first adds can't create two carts.
      const cart = await tx.cart.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });

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

    revalidatePath("/cart");
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
  const userId = await getCurrentUserId();
  if (!userId) return UNAUTHENTICATED();

  const parsed = updateQuantitySchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT();
  const { itemId, quantity } = parsed.data;

  try {
    // Scoped to this user: someone else's item is indistinguishable from a
    // missing one, on purpose.
    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
      select: {
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
    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity: final } });

    revalidatePath("/cart");
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
 * Removes one line from the user's cart.
 */
export async function removeCartItem(input: unknown): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return UNAUTHENTICATED();

  const parsed = removeItemSchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT();

  try {
    // deleteMany (not delete): it accepts the relation filter and returns
    // { count } instead of throwing when nothing matched.
    const { count } = await prisma.cartItem.deleteMany({
      where: { id: parsed.data.itemId, cart: { userId } },
    });
    if (count === 0) return fail("ITEM_NOT_FOUND", "That item is no longer in your cart.");

    revalidatePath("/cart");
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("removeCartItem failed", error);
    return UNKNOWN();
  }
}

// Note: there's deliberately no clearCart action. The cart is cleared by the
// Stripe webhook inside the order-creation transaction, not by the client.
