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

import { formatVariantLabel } from "@/lib/catalog/format";
import { adjustStock } from "@/lib/inventory/adjust";
import { prisma } from "@/lib/prisma";
import type { Dimensions, OptionNames, OptionValues } from "./variant-fields";

export type VariantFields = {
  option: OptionValues; // both null = the product's default variant
  priceCents: number;
  sku: string; // normalized
  amazonAsin: string | null;
  gtin: string | null; // check digit already verified
  dimensions: Dimensions | null; // null = none (all three or none, CHECK in SQL)
  position: number | null; // null on create = after the last variant
};

export type VariantField =
  | "option"
  | "priceCents"
  | "sku"
  | "amazonAsin"
  | "gtin"
  | "dimensions"
  | "position"
  | "openingStock"
  | "isActive";

function dimensionData(dimensions: Dimensions | null) {
  return dimensions ?? { heightIn: null, widthIn: null, depthIn: null };
}

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
    // Backstop for the checks below: SKU and (product, option values) are unique.
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
 * first, so the rules below (values match the product's option names, no
 * duplicates, keep one active while listed) are checked against variants
 * and option names nobody else is changing.
 */
async function lockProduct(tx: Prisma.TransactionClient, productId: number) {
  const [product] = await tx.$queryRaw<({ status: string } & OptionNames)[]>`
    SELECT "status", "option1Name", "option2Name" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`;
  return product ?? null;
}

type Sibling = { id: number; isActive: boolean } & OptionValues;

/**
 * The option rules. A CHECK can't compare a variant with its product, so:
 *  - values are set exactly where the product has option names;
 *  - no two variants of a product with the same values, ignoring case (the
 *    unique index is case-sensitive). With no options, that means one variant.
 */
function optionProblem(names: OptionNames, option: OptionValues, siblings: Sibling[]): string | null {
  const pairs = [
    [names.option1Name, option.option1Value],
    [names.option2Name, option.option2Value],
  ] as const;
  for (const [name, value] of pairs) {
    if (name && !value) return `Enter a ${name}.`;
    if (!name && value) return "This product has no option for that value. Set option names on the product first.";
  }

  const key = (values: OptionValues) =>
    [values.option1Value, values.option2Value].map((value) => value?.toLowerCase() ?? "").join("\u0000");
  const twin = siblings.find((sibling) => key(sibling) === key(option));
  if (!twin) return null;
  const off = twin.isActive ? "" : " (turned off; turn it back on instead)";
  const label = formatVariantLabel(twin);
  if (!label) {
    return `This product has no options, so it has just one variant${off}. Products with options are set up in the product details.`;
  }
  return `This product already has ${label}${off}.`;
}

/**
 * Locks the variant's product, then reads the variant. Read after the lock:
 * read before, isActive could change before we hold it.
 */
async function lockVariant(tx: Prisma.TransactionClient, variantId: number) {
  const ref = await tx.productVariant.findUnique({ where: { id: variantId }, select: { productId: true } });
  if (!ref) return null;
  const product = await lockProduct(tx, ref.productId);
  if (!product) return null;
  const variant = await tx.productVariant.findUniqueOrThrow({
    where: { id: variantId },
    select: { productId: true, option1Value: true, option2Value: true, isActive: true },
  });
  return { ...variant, product };
}

async function siblingsOf(tx: Prisma.TransactionClient, productId: number, exceptId: number | null) {
  return tx.productVariant.findMany({
    where: { productId, ...(exceptId !== null && { id: { not: exceptId } }) },
    select: { id: true, option1Value: true, option2Value: true, isActive: true },
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
    const product = await lockProduct(tx, productId);
    if (!product) return fail("This product no longer exists.");

    const siblings = await siblingsOf(tx, productId, null);
    const problem = optionProblem(product, fields.option, siblings);
    if (problem) return fail(problem, "option");
    await assertSkuFree(tx, fields.sku, null);

    const last = await tx.productVariant.aggregate({ where: { productId }, _max: { position: true } });
    const variant = await tx.productVariant.create({
      data: {
        productId,
        ...fields.option,
        priceCents: fields.priceCents,
        sku: fields.sku,
        amazonAsin: fields.amazonAsin,
        gtin: fields.gtin,
        ...dimensionData(fields.dimensions),
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
 * Edits a variant's option, price, SKU, ASIN, GTIN, dimensions, and position. Stock isn't
 * editable here: it changes only through the ledger (inventory page).
 * Past orders keep the SKU and price they were placed with.
 */
export async function updateProductVariant(variantId: number, fields: VariantFields): Promise<VariantResult> {
  return run(async (tx) => {
    const current = await lockVariant(tx, variantId);
    if (!current) return fail("This variant no longer exists.");

    const siblings = await siblingsOf(tx, current.productId, variantId);
    const problem = optionProblem(current.product, fields.option, siblings);
    if (problem) return fail(problem, "option");
    await assertSkuFree(tx, fields.sku, variantId);

    await tx.productVariant.update({
      where: { id: variantId },
      data: {
        ...fields.option,
        priceCents: fields.priceCents,
        sku: fields.sku,
        amazonAsin: fields.amazonAsin,
        gtin: fields.gtin,
        ...dimensionData(fields.dimensions),
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
      // Re-checked: a variant switched off before its product's options were
      // set (a re-seeded product, say) may not match them.
      const problem = optionProblem(current.product, current, siblings);
      if (problem) return fail(problem, "isActive");
    } else if (current.product.status === "ACTIVE" && !siblings.some((s) => s.isActive)) {
      return fail("This is the product's only active variant. Unlist the product before turning it off.", "isActive");
    }

    await tx.productVariant.update({ where: { id: variantId }, data: { isActive: active } });
    return { ok: true, id: variantId };
  });
}
