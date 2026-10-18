// lib/cart/queries.ts
//
// The READ side. Server components (cart page, header badge) call these
// directly; no server action needed just to display data.
import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getImageUrl } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import type { CartLineView, CartView, LineAvailability } from "./types";

// One image per line: the variant's own first image, else the product's first
// image. Shared with CartItemWithDetails so the query and mapper can't drift.
const cartItemInclude = {
  variant: {
    include: {
      product: {
        select: {
          name: true,
          slug: true,
          status: true,
          images: {
            select: { key: true, alt: true },
            orderBy: { position: "asc" },
            take: 1,
          },
        },
      },
      images: {
        select: { key: true, alt: true },
        orderBy: { position: "asc" },
        take: 1,
      },
    },
  },
} satisfies Prisma.CartItemInclude;

type CartItemWithDetails = Prisma.CartItemGetPayload<{
  include: typeof cartItemInclude;
}>;

/**
 * Loads the user's cart with everything the UI needs, prices read fresh.
 * Does NOT create a cart. A user with no cart gets an empty CartView.
 */
export async function getCartView(userId: number): Promise<CartView> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      // createdAt asc so lines don't jump around on refresh
      items: { include: cartItemInclude, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
    },
  });

  if (!cart) {
    return { cartId: null, lines: [], subtotalCents: 0, itemCount: 0, hasIssues: false };
  }

  const lines = cart.items.map(toCartLineView);

  return {
    cartId: cart.id,
    lines,
    subtotalCents: lines
      .filter((line) => line.availability !== "unavailable")
      .reduce((sum, line) => sum + line.lineTotalCents, 0),
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    hasIssues: lines.some((line) => line.availability !== "ok"),
  };
}

/**
 * Lightweight count for the header badge, so every page load doesn't pull
 * the full cart with images. One aggregate query.
 */
export async function getCartItemCount(userId: number): Promise<number> {
  const result = await prisma.cartItem.aggregate({
    where: { cart: { userId } },
    _sum: { quantity: true },
  });
  // _sum.quantity is null when there are no rows
  return result._sum.quantity ?? 0;
}

export function getAvailability(
  quantity: number,
  stock: number,
  purchasable: boolean,
): LineAvailability {
  if (!purchasable || stock <= 0) return "unavailable";
  if (quantity > stock) return "limited";
  return "ok";
}

export function formatVariantLabel(
  name: string | null,
  value: string | null,
): string | null {
  // Both null means the product's default variant: no label to show.
  return name && value ? `${name}: ${value}` : null;
}

function toCartLineView(item: CartItemWithDetails): CartLineView {
  const { variant } = item;
  const { product } = variant;
  const image = variant.images[0] ?? product.images[0] ?? null;
  const productActive = product.status === "ACTIVE";
  const purchasable = productActive && variant.isActive;

  return {
    itemId: item.id,
    variantId: variant.id,
    productName: product.name,
    productSlug: product.slug,
    productActive,
    variantLabel: formatVariantLabel(variant.name, variant.value),
    imageUrl: image ? getImageUrl(image.key) : null,
    imageAlt: image?.alt ?? null,
    unitPriceCents: variant.priceCents,
    quantity: item.quantity,
    lineTotalCents: variant.priceCents * item.quantity,
    stock: variant.stock,
    availability: getAvailability(item.quantity, variant.stock, purchasable),
  };
}
