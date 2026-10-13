// lib/products/variants.ts
//
// Creating, editing, and turning variants on or off. Server actions in
// ./variant-actions call these after requireStaff() and after parsing the
// form; keeping them here means they aren't public endpoints and can be
// tested against a real database.
//
// Variants are never deleted: the stock ledger and past orders point at them.
// Stock is never written here except the opening count, through the ledger.
import "server-only";

import { Prisma } from "@/generated/prisma/client";

import { adjustStock } from "@/lib/inventory/adjust";
import { prisma } from "@/lib/prisma";
import { optionLabel, type VariantOption } from "./variant-fields";

export type VariantFields = {
  option: VariantOption; // null = the product's default variant
  priceCents: number;
  sku: string; // normalized
  amazonAsin: string | null;
  position: number | null; // null on create = after the last variant
};

export type VariantField = "option" | "priceCents" | "sku" | "amazonAsin" | "position" | "openingStock" | "isActive";

export type VariantResult = { ok: true; id: number } | { ok: false; field?: VariantField; message: string };

// Thrown inside a transaction to roll it back while still returning a result.
class Rollback extends Error {
  constructor(readonly result: Extract<VariantResult, { ok: false }>) {
    super(result.message);
  }
}

function fail(message: string, field?: VariantField): Extract<VariantResult, { ok: false }> {
  return { ok: false, field, message };
}

async function run(fn: (tx: Prisma.TransactionClient) => Promise<VariantResult>): Promise<VariantResult> {
  try {
    return await prisma.$transaction(fn);
  } catch (err) {
    if (err instanceof Rollback) return err.result;
    // Backstop for the checks below: SKU and (product, name, value) are unique.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = String(err.meta?.target ?? "");
      if (target.includes("sku")) return fail("Another variant just took that SKU.", "sku");
      return fail("This product already has a variant with that option.", "option");
    }
    throw err;
  }
}

/**
 * Locks the product row. Every variant write on a product takes this lock
 * first, so the rules below (one default, no duplicates, keep one active
 * while listed) are checked against variants nobody else is changing.
 */
async function lockProduct(tx: Prisma.TransactionClient, productId: number) {
  const [product] = await tx.$queryRaw<{ status: string }[]>`
    SELECT "status" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`;
  return product ?? null;
}

type Sibling = { id: number; name: string | null; value: string | null; isActive: boolean };

/**
 * The option rules, checked against the product's other variants:
 *  - no two variants with the same option, ignoring case (the unique index
 *    is case-sensitive and treats a null pair as distinct);
 *  - among ACTIVE variants, either one default or only named options. A
 *    "Default" choice next to "Size: Large" would make no sense to a shopper.
 */
function optionProblem(option: VariantOption, active: boolean, siblings: Sibling[]): string | null {
  const key = (name: string, value: string) => `${name.toLowerCase()}\u0000${value.toLowerCase()}`;
  if (option) {
    const mine = key(option.name, option.value);
    const twin = siblings.find((s) => s.name && s.value && key(s.name, s.value) === mine);
    if (twin) {
      const label = optionLabel({ name: twin.name!, value: twin.value! });
      return `This product already has ${label}${twin.isActive ? "" : " (turned off; turn it back on instead)"}.`;
    }
  }
  if (!active) return null;

  const activeSiblings = siblings.filter((s) => s.isActive);
  const activeDefault = activeSiblings.some((s) => s.name === null);
  if (!option && activeDefault) return "This product already has an active default variant.";
  if (!option && activeSiblings.length > 0) {
    return "This product's variants have options. Give this one an option too (e.g. Size: Large).";
  }
  if (option && activeDefault) {
    return "This product has a default variant with no option. Turn it off, or give it an option, before adding options.";
  }
  return null;
}

/**
 * Locks the variant's product, then reads the variant. Read after the lock:
 * read before, isActive could change before we hold it.
 */
async function lockVariant(tx: Prisma.TransactionClient, variantId: number) {
  const ref = await tx.productVariant.findUnique({ where: { id: variantId }, select: { productId: true } });
  if (!ref) return null;
  const product = await lockProduct(tx, ref.productId);
  const variant = await tx.productVariant.findUniqueOrThrow({
    where: { id: variantId },
    select: { productId: true, name: true, value: true, isActive: true },
  });
  return { ...variant, productStatus: product?.status ?? null };
}

async function siblingsOf(tx: Prisma.TransactionClient, productId: number, exceptId: number | null) {
  return tx.productVariant.findMany({
    where: { productId, ...(exceptId !== null && { id: { not: exceptId } }) },
    select: { id: true, name: true, value: true, isActive: true },
  });
}

async function assertSkuFree(tx: Prisma.TransactionClient, sku: string, exceptId: number | null) {
  const holder = await tx.productVariant.findUnique({
    where: { sku },
    select: { id: true, product: { select: { name: true } } },
  });
  if (holder && holder.id !== exceptId) {
    throw new Rollback(fail(`SKU ${sku} is already used by "${holder.product.name}".`, "sku"));
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Adds an active variant. A non-zero opening stock is written as an
 * INITIAL_STOCK ledger row in the same transaction, never straight to stock.
 */
export async function createProductVariant(
  productId: number,
  fields: VariantFields & { openingStock: number },
  adminId: number,
): Promise<VariantResult> {
  return run(async (tx) => {
    if (!(await lockProduct(tx, productId))) return fail("This product no longer exists.");

    const siblings = await siblingsOf(tx, productId, null);
    const problem = optionProblem(fields.option, true, siblings);
    if (problem) return fail(problem, "option");
    await assertSkuFree(tx, fields.sku, null);

    const last = await tx.productVariant.aggregate({ where: { productId }, _max: { position: true } });
    const variant = await tx.productVariant.create({
      data: {
        productId,
        name: fields.option?.name ?? null,
        value: fields.option?.value ?? null,
        priceCents: fields.priceCents,
        sku: fields.sku,
        amazonAsin: fields.amazonAsin,
        position: fields.position ?? (last._max.position ?? -1) + 1,
        stock: 0,
        isActive: true,
      },
      select: { id: true },
    });

    if (fields.openingStock > 0) {
      const result = await adjustStock(tx, {
        variantId: variant.id,
        delta: fields.openingStock,
        reason: "INITIAL_STOCK",
        createdById: adminId,
        note: "Opening stock",
      });
      // An increment on a row we just created can't come up short.
      if (!result.ok) throw new Error(`Opening stock for variant ${variant.id} failed: ${result.reason}`);
    }
    return { ok: true, id: variant.id };
  });
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/**
 * Edits a variant's option, price, SKU, ASIN, and position. Stock isn't
 * editable here: it changes only through the ledger (inventory page).
 * Past orders keep the SKU and price they were placed with.
 */
export async function updateProductVariant(variantId: number, fields: VariantFields): Promise<VariantResult> {
  return run(async (tx) => {
    const current = await lockVariant(tx, variantId);
    if (!current) return fail("This variant no longer exists.");

    const siblings = await siblingsOf(tx, current.productId, variantId);
    const problem = optionProblem(fields.option, current.isActive, siblings);
    if (problem) return fail(problem, "option");
    await assertSkuFree(tx, fields.sku, variantId);

    await tx.productVariant.update({
      where: { id: variantId },
      data: {
        name: fields.option?.name ?? null,
        value: fields.option?.value ?? null,
        priceCents: fields.priceCents,
        sku: fields.sku,
        amazonAsin: fields.amazonAsin,
        ...(fields.position !== null && { position: fields.position }),
      },
    });
    return { ok: true, id: variantId };
  });
}

// ---------------------------------------------------------------------------
// Turn on / off
// ---------------------------------------------------------------------------

/**
 * Turning a variant off hides it from the storefront; carts holding it show
 * it as unavailable. A listed product must keep at least one active variant,
 * so turning off its last one is refused: unlist the product first.
 */
export async function setVariantActive(variantId: number, active: boolean): Promise<VariantResult> {
  return run(async (tx) => {
    const current = await lockVariant(tx, variantId);
    if (!current) return fail("This variant no longer exists.");
    if (current.isActive === active) return { ok: true, id: variantId };

    const siblings = await siblingsOf(tx, current.productId, variantId);
    if (active) {
      const option = current.name && current.value ? { name: current.name, value: current.value } : null;
      const problem = optionProblem(option, true, siblings);
      if (problem) return fail(problem, "isActive");
    } else if (current.productStatus === "ACTIVE" && !siblings.some((s) => s.isActive)) {
      return fail("This is the product's only active variant. Unlist the product before turning it off.", "isActive");
    }

    await tx.productVariant.update({ where: { id: variantId }, data: { isActive: active } });
    return { ok: true, id: variantId };
  });
}
