import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { createUser, createVariant, resetDb } from "../../../test/db";

// The request around the actions: a cookie jar, the session, and the limiter.
const request = vi.hoisted(() => ({
  jar: new Map<string, string>(),
  userId: null as number | null,
  limited: false,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (request.jar.has(name) ? { name, value: request.jar.get(name) } : undefined),
    has: (name: string) => request.jar.has(name),
    // maxAge 0 is how guest-token clears the cookie; a browser drops it.
    set: (name: string, value: string, options?: { maxAge?: number }) => {
      if (options?.maxAge === 0) request.jar.delete(name);
      else request.jar.set(name, value);
    },
  }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/auth-actions", () => ({
  auth: async () => (request.userId === null ? null : { user: { id: String(request.userId), email: "u@example.com" } }),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkLimit: async () => ({ ok: !request.limited, retryAfterSec: 60 }),
  clientIp: () => "203.0.113.7",
  guestCartAddLimiter: {},
  guestCartCreateLimiter: {},
}));

const { addToCart, removeCartItem, updateCartItemQuantity } = await import("./actions");
const { GUEST_COOKIE_NAME, generateGuestToken, hashGuestToken } = await import("./guest-token");
const { mergeGuestCart } = await import("./merge");
const { getCartView } = await import("./queries");
const { getCurrentCartOwner } = await import("./session");

const OLD = new Date("2020-01-01T00:00:00Z");
const cookie = () => request.jar.get(GUEST_COOKIE_NAME);

/** A guest cart the way addToCart leaves it: cookie in the jar, hash in the row. */
async function guestCart(lines: { variantId: number; quantity: number }[]) {
  const token = generateGuestToken();
  request.jar.set(GUEST_COOKIE_NAME, token);
  return prisma.cart.create({
    data: { guestTokenHash: hashGuestToken(token), items: { create: lines } },
  });
}

async function itemsOf(cartId: number) {
  const items = await prisma.cartItem.findMany({ where: { cartId }, orderBy: { variantId: "asc" } });
  return items.map(({ variantId, quantity }) => ({ variantId, quantity }));
}

beforeEach(async () => {
  await resetDb();
  request.jar.clear();
  request.userId = null;
  request.limited = false;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("guest addToCart", () => {
  it("creates a cart owned only by the token's hash, and sets the cookie", async () => {
    const variant = await createVariant({ stock: 5 });

    const result = await addToCart({ variantId: variant.id, quantity: 2 });

    expect(result).toEqual({ ok: true, data: { quantity: 2 }, notice: undefined });
    const token = cookie();
    expect(token).toHaveLength(43);
    const cart = await prisma.cart.findFirstOrThrow({ include: { items: true } });
    expect(cart.userId).toBeNull();
    expect(cart.guestTokenHash).toBe(hashGuestToken(token!));
    expect(cart.guestTokenHash).not.toBe(token);
    expect(cart.items.map((i) => i.quantity)).toEqual([2]);
  });

  it("adds to the same cart on the next add", async () => {
    const variant = await createVariant({ stock: 5 });
    await addToCart({ variantId: variant.id, quantity: 1 });
    const token = cookie();

    await addToCart({ variantId: variant.id, quantity: 2 });

    expect(cookie()).toBe(token);
    expect(await prisma.cart.count()).toBe(1);
    expect((await prisma.cartItem.findFirstOrThrow()).quantity).toBe(3);
  });

  it("with a token whose cart is gone, creates a new cart under a new hash", async () => {
    const variant = await createVariant({ stock: 5 });
    const stale = generateGuestToken();
    request.jar.set(GUEST_COOKIE_NAME, stale);

    const result = await addToCart({ variantId: variant.id, quantity: 1 });

    expect(result.ok).toBe(true);
    expect(cookie()).not.toBe(stale);
    expect(await prisma.cart.findUnique({ where: { guestTokenHash: hashGuestToken(stale) } })).toBeNull();
    const cart = await prisma.cart.findFirstOrThrow();
    expect(cart.guestTokenHash).toBe(hashGuestToken(cookie()!));
  });

  it("treats a malformed cookie as no cookie", async () => {
    const variant = await createVariant({ stock: 5 });
    request.jar.set(GUEST_COOKIE_NAME, "not-a-token");

    await addToCart({ variantId: variant.id, quantity: 1 });

    expect(cookie()).not.toBe("not-a-token");
    expect(await prisma.cart.count()).toBe(1);
  });

  it("returns RATE_LIMITED without creating a cart or a cookie", async () => {
    const variant = await createVariant({ stock: 5 });
    request.limited = true;

    const result = await addToCart({ variantId: variant.id, quantity: 1 });

    expect(result).toMatchObject({ ok: false, error: "RATE_LIMITED" });
    expect(await prisma.cart.count()).toBe(0);
    expect(cookie()).toBeUndefined();
  });

  it("doesn't rate-limit signed-in users", async () => {
    const user = await createUser();
    const variant = await createVariant({ stock: 5 });
    request.userId = user.id;
    request.limited = true;

    expect((await addToCart({ variantId: variant.id, quantity: 1 })).ok).toBe(true);
  });
});

describe("guest update and remove", () => {
  it("need an owner", async () => {
    expect(await updateCartItemQuantity({ itemId: 1, quantity: 1 })).toMatchObject({ error: "UNAUTHENTICATED" });
    expect(await removeCartItem({ itemId: 1 })).toMatchObject({ error: "UNAUTHENTICATED" });
  });

  it("can't touch another guest's item", async () => {
    const variant = await createVariant({ stock: 5 });
    const other = await guestCart([{ variantId: variant.id, quantity: 1 }]);
    const [item] = await prisma.cartItem.findMany({ where: { cartId: other.id } });
    await guestCart([]); // this browser's own cart

    expect(await updateCartItemQuantity({ itemId: item.id, quantity: 2 })).toMatchObject({ error: "ITEM_NOT_FOUND" });
    expect(await removeCartItem({ itemId: item.id })).toMatchObject({ error: "ITEM_NOT_FOUND" });
    expect(await itemsOf(other.id)).toEqual([{ variantId: variant.id, quantity: 1 }]);
  });
});

describe("Cart.updatedAt", () => {
  async function age(cartId: number) {
    await prisma.cart.update({ where: { id: cartId }, data: { updatedAt: OLD } });
  }
  async function updatedAt(cartId: number) {
    return (await prisma.cart.findUniqueOrThrow({ where: { id: cartId } })).updatedAt;
  }

  it("moves forward on every guest action", async () => {
    const variant = await createVariant({ stock: 5 });
    const cart = await guestCart([{ variantId: variant.id, quantity: 1 }]);
    const [item] = await prisma.cartItem.findMany({ where: { cartId: cart.id } });

    await age(cart.id);
    await addToCart({ variantId: variant.id, quantity: 1 });
    expect(await updatedAt(cart.id)).not.toEqual(OLD);

    await age(cart.id);
    await updateCartItemQuantity({ itemId: item.id, quantity: 1 });
    expect(await updatedAt(cart.id)).not.toEqual(OLD);

    await age(cart.id);
    await removeCartItem({ itemId: item.id });
    expect(await updatedAt(cart.id)).not.toEqual(OLD);
  });

  it("moves forward when a signed-in user adds to an existing cart", async () => {
    const user = await createUser();
    const variant = await createVariant({ stock: 5 });
    request.userId = user.id;
    await addToCart({ variantId: variant.id, quantity: 1 });
    const cart = await prisma.cart.findUniqueOrThrow({ where: { userId: user.id } });

    await age(cart.id);
    await addToCart({ variantId: variant.id, quantity: 1 });
    expect(await updatedAt(cart.id)).not.toEqual(OLD);
  });
});

describe("mergeGuestCart", () => {
  it("with no user cart, re-owns the guest cart and caps its lines", async () => {
    const user = await createUser();
    const plenty = await createVariant({ stock: 50 });
    const scarce = await createVariant({ stock: 2 });
    const gone = await createVariant({ stock: 0 });
    const guest = await guestCart([
      { variantId: plenty.id, quantity: 3 },
      { variantId: scarce.id, quantity: 5 },
      { variantId: gone.id, quantity: 1 },
    ]);
    await prisma.cart.update({ where: { id: guest.id }, data: { updatedAt: OLD } });

    await mergeGuestCart(user.id);

    // Same row, now the user's: Cart_owner_check (exactly one owner) held.
    const cart = await prisma.cart.findUniqueOrThrow({ where: { id: guest.id } });
    expect(cart.userId).toBe(user.id);
    expect(cart.guestTokenHash).toBeNull();
    expect(cart.updatedAt).not.toEqual(OLD);
    expect(await itemsOf(cart.id)).toEqual([
      { variantId: plenty.id, quantity: 3 },
      { variantId: scarce.id, quantity: 2 },
    ]);
    expect(cookie()).toBeUndefined();
  });

  it("into an existing user cart, sums and caps, then deletes the guest cart", async () => {
    const user = await createUser();
    const shared = await createVariant({ stock: 4 });
    const atMax = await createVariant({ stock: 50 });
    const guestOnly = await createVariant({ stock: 50 });
    const gone = await createVariant({ stock: 0 });
    const userCart = await prisma.cart.create({
      data: {
        userId: user.id,
        items: {
          create: [
            { variantId: shared.id, quantity: 2 },
            { variantId: atMax.id, quantity: 8 },
            { variantId: gone.id, quantity: 1 },
          ],
        },
      },
    });
    const guest = await guestCart([
      { variantId: shared.id, quantity: 3 },
      { variantId: atMax.id, quantity: 5 },
      { variantId: guestOnly.id, quantity: 1 },
      { variantId: gone.id, quantity: 2 },
    ]);

    await mergeGuestCart(user.id);

    expect(await itemsOf(userCart.id)).toEqual(
      [
        { variantId: shared.id, quantity: 4 }, // 2 + 3, capped at stock
        { variantId: atMax.id, quantity: 10 }, // 8 + 5, capped at MAX_QTY_PER_LINE
        { variantId: guestOnly.id, quantity: 1 },
        { variantId: gone.id, quantity: 1 }, // no stock: the user's line as it was
      ].sort((a, b) => a.variantId - b.variantId),
    );
    expect(await prisma.cart.findUnique({ where: { id: guest.id } })).toBeNull();
    expect(await prisma.cartItem.count({ where: { cartId: guest.id } })).toBe(0);
    expect(cookie()).toBeUndefined();
  });

  it("with no guest cart for the cookie, only clears the cookie", async () => {
    const user = await createUser();
    request.jar.set(GUEST_COOKIE_NAME, generateGuestToken());

    await mergeGuestCart(user.id);

    expect(cookie()).toBeUndefined();
    expect(await prisma.cart.count()).toBe(0);
  });

  it("clears a malformed cookie without querying for it", async () => {
    const user = await createUser();
    request.jar.set(GUEST_COOKIE_NAME, "garbage");

    await mergeGuestCart(user.id);

    expect(cookie()).toBeUndefined();
  });
});

describe("signed in wins", () => {
  it("a user owner never reads or writes the guest cart", async () => {
    const user = await createUser();
    const variant = await createVariant({ stock: 5 });
    const guest = await guestCart([{ variantId: variant.id, quantity: 3 }]);
    request.userId = user.id;

    expect(await getCurrentCartOwner()).toEqual({ kind: "user", userId: user.id });
    expect((await getCartView(await getCurrentCartOwner())).lines).toEqual([]);

    await addToCart({ variantId: variant.id, quantity: 1 });

    expect(await itemsOf(guest.id)).toEqual([{ variantId: variant.id, quantity: 3 }]);
    const userCart = await prisma.cart.findUniqueOrThrow({ where: { userId: user.id } });
    expect(await itemsOf(userCart.id)).toEqual([{ variantId: variant.id, quantity: 1 }]);
  });

  it("no owner reads an empty cart", async () => {
    expect(await getCurrentCartOwner()).toBeNull();
    expect(await getCartView(null)).toMatchObject({ cartId: null, lines: [], itemCount: 0 });
  });
});
