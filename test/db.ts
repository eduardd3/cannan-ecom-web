// Helpers for *.db.test.ts files: a guarded reset and small factories.
import { adjustStockStandalone } from "@/lib/inventory/adjust";
import { prisma } from "@/lib/prisma";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

// Tests own every table except Collection and ProductType, whose rows come
// from migrations.
const TABLES = [
  "InventoryAdjustment",
  "OrderItem",
  "Order",
  "CartItem",
  "Cart",
  "ProductImage",
  "ProductSlugRedirect",
  "ProductVariant",
  "Product",
  "Category",
  "Token",
  "User",
];

/** Empties the test tables. Checks the host again: this is the destructive part. */
export async function resetDb() {
  const host = new URL(process.env.DATABASE_URL ?? "").hostname;
  if (!LOCAL_HOSTS.has(host)) throw new Error(`resetDb refuses non-local host "${host}"`);
  const list = TABLES.map((table) => `"${table}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

let sequence = 0;

export async function createUser(role: "CUSTOMER" | "ADMIN" = "CUSTOMER") {
  sequence += 1;
  return prisma.user.create({ data: { email: `user${sequence}@example.com`, role } });
}

/** The default collection and the first product type, both from migrations. */
export async function catalogRefs() {
  const [collection, productType] = await Promise.all([
    prisma.collection.findFirstOrThrow({ where: { isDefault: true } }),
    prisma.productType.findFirstOrThrow({ orderBy: { position: "asc" } }),
  ]);
  return { collectionId: collection.id, productTypeId: productType.id };
}

/** A product with one default variant. Opening stock goes in through the ledger, as in the seed. */
export async function createVariant({ stock, priceCents = 1500 }: { stock: number; priceCents?: number }) {
  sequence += 1;
  const product = await prisma.product.create({
    data: {
      slug: `product-${sequence}`,
      name: `Product ${sequence}`,
      description: "Test product",
      status: "ACTIVE",
      publishedAt: new Date(), // required while ACTIVE (CHECK in SQL)
      ...(await catalogRefs()),
      variants: { create: { sku: `SKU-${sequence}`, priceCents, stock: 0 } },
    },
    include: { variants: true },
  });
  const variant = product.variants[0];
  if (stock > 0) {
    const result = await adjustStockStandalone({ variantId: variant.id, delta: stock, reason: "INITIAL_STOCK" });
    if (!result.ok) throw new Error("createVariant: opening stock failed");
  }
  return variant;
}

export async function stockOf(variantId: number) {
  const variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId }, select: { stock: true } });
  return variant.stock;
}

export async function addToCart(userId: number, variantId: number, quantity: number) {
  const cart = await prisma.cart.upsert({ where: { userId }, create: { userId }, update: {} });
  await prisma.cartItem.create({ data: { cartId: cart.id, variantId, quantity } });
}
