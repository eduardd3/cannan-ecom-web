// lib/cart/types.ts
//
// Types only. No runtime code lives here, so both server and client files
// can import from it without dragging Prisma into a client bundle.

// ---------------------------------------------------------------------------
// Action results
// ---------------------------------------------------------------------------

// Every cart server action returns this instead of throwing.
// Thrown errors in server actions reach the client as a generic message
// (Next.js strips details in production), so expected failures like
// "out of stock" are values the UI can switch on, not exceptions.
export type CartErrorCode =
  | "UNAUTHENTICATED"
  | "INVALID_INPUT"
  | "VARIANT_NOT_FOUND" // missing, or its product isn't purchasable
  | "ITEM_NOT_FOUND" // missing, OR belongs to someone else's cart (same answer on purpose)
  | "OUT_OF_STOCK"
  | "UNKNOWN";

export type ActionResult<T = void> =
  | { ok: true; data: T; notice?: string } // notice: e.g. "Only 3 left — quantity adjusted"
  | { ok: false; error: CartErrorCode; message: string };

// ---------------------------------------------------------------------------
// Read model: what the cart page / cart drawer renders
// ---------------------------------------------------------------------------

export type LineAvailability =
  | "ok" // quantity <= stock
  | "limited" // stock > 0 but less than quantity in cart
  | "unavailable"; // stock is 0, or product no longer purchasable

export type CartLineView = {
  itemId: number;
  variantId: number;
  productName: string;
  productSlug: string;
  productActive: boolean; // product.status is ACTIVE, so /products/[slug] exists
  variantLabel: string | null; // e.g. "Roja · 12 in"; null for a default variant
  imageUrl: string | null;
  imageAlt: string | null;
  unitPriceCents: number; // read fresh from ProductVariant, never from the cart
  quantity: number;
  lineTotalCents: number; // unitPriceCents * quantity
  stock: number;
  availability: LineAvailability;
};

export type CartView = {
  cartId: number | null; // null = user has never added anything (no row yet)
  lines: CartLineView[];
  subtotalCents: number; // sum of lineTotalCents for purchasable lines only
  itemCount: number; // sum of quantities, for the header badge
  hasIssues: boolean; // any line not "ok" → block the checkout button
};