// lib/products/save.ts
//
// Creating and editing products. Server actions in ./actions call these after
// requireStaff() and after parsing the form; keeping them out of the
// "use server" file means they aren't public endpoints and can be tested
// against a real database.
import "server-only";

import { Prisma, type ProductStatus } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { productPath } from "./slug";

export type ProductFields = {
  name: string;
  slug: string; // already validated with slugProblem
  description: string;
  collectionId: number;
  categoryIds: number[];
};

export type ProductField = keyof ProductFields | "status";

export type SaveProductResult =
  | { ok: true; id: number }
  | { ok: false; field?: ProductField; message: string };

// Thrown inside a transaction to roll it back while still returning a result.
class Rollback extends Error {
  constructor(readonly result: Extract<SaveProductResult, { ok: false }>) {
    super(result.message);
  }
}

function fail(message: string, field?: ProductField): Extract<SaveProductResult, { ok: false }> {
  return { ok: false, field, message };
}

async function run(fn: (tx: Prisma.TransactionClient) => Promise<SaveProductResult>): Promise<SaveProductResult> {
  try {
    return await prisma.$transaction(fn);
  } catch (err) {
    if (err instanceof Rollback) return err.result;
    // Backstop for the checks below: another product took the slug between
    // our check and our write.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("Another product just took that slug. Pick a different one.", "slug");
    }
    throw err;
  }
}

/**
 * Serializes every transaction that claims a slug. A slug must be unique
 * across Product.slug AND ProductSlugRedirect.slug, which no single index
 * can enforce; without this, a rename that frees "x" (keeping it as a
 * redirect) and another product claiming "x" could both commit.
 */
async function lockSlugs(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('product-slugs'))`;
}

/** Refuses a slug held by another product, as its current slug or an old one. */
async function assertSlugFree(tx: Prisma.TransactionClient, slug: string, productId: number | null) {
  const [current, redirect] = await Promise.all([
    tx.product.findUnique({ where: { slug }, select: { id: true, name: true } }),
    tx.productSlugRedirect.findUnique({
      where: { slug },
      select: { productId: true, product: { select: { name: true } } },
    }),
  ]);
  if (current && current.id !== productId) {
    throw new Rollback(fail(`"${current.name}" already uses ${productPath(slug)}.`, "slug"));
  }
  if (redirect && redirect.productId !== productId) {
    throw new Rollback(
      fail(`${productPath(slug)} used to belong to "${redirect.product.name}" and still redirects there.`, "slug"),
    );
  }
}

/** Collection and categories come from select lists; a stale form could still send a deleted id. */
async function assertRefsExist(tx: Prisma.TransactionClient, fields: ProductFields) {
  const [collection, categoryCount] = await Promise.all([
    tx.collection.findUnique({ where: { id: fields.collectionId }, select: { id: true } }),
    tx.category.count({ where: { id: { in: fields.categoryIds } } }),
  ]);
  if (!collection) throw new Rollback(fail("Pick a collection.", "collectionId"));
  if (categoryCount !== new Set(fields.categoryIds).size) {
    throw new Rollback(fail("A selected category no longer exists. Reload and try again.", "categoryIds"));
  }
}

function categoryLinks(categoryIds: number[]) {
  return [...new Set(categoryIds)].map((categoryId) => ({ categoryId }));
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * New products start as DRAFT: they have no variants yet, and a product
 * can't be listed without one.
 */
export async function createProduct(fields: ProductFields): Promise<SaveProductResult> {
  return run(async (tx) => {
    await lockSlugs(tx);
    await assertSlugFree(tx, fields.slug, null);
    await assertRefsExist(tx, fields);

    const product = await tx.product.create({
      data: {
        name: fields.name,
        slug: fields.slug,
        description: fields.description,
        collectionId: fields.collectionId,
        status: "DRAFT",
        categories: { create: categoryLinks(fields.categoryIds) },
      },
      select: { id: true },
    });
    return { ok: true, id: product.id };
  });
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/**
 * Saves the product form.
 *
 * Slug: if the product has ever been listed, its old slug is kept as a
 * redirect so indexed links keep working. Moving back to one of its own old
 * slugs removes that redirect (the slug is current again).
 *
 * Status: listing requires an active variant, and the first listing stamps
 * publishedAt.
 */
export async function updateProduct(
  productId: number,
  fields: ProductFields & { status: ProductStatus },
): Promise<SaveProductResult> {
  return run(async (tx) => {
    await lockSlugs(tx);
    // Lock the row: two admins saving at once would otherwise both read the
    // old slug and both try to keep it as a redirect.
    const [product] = await tx.$queryRaw<{ slug: string; publishedAt: Date | null }[]>`
      SELECT "slug", "publishedAt" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`;
    if (!product) return fail("This product no longer exists.");

    await assertRefsExist(tx, fields);

    if (fields.status === "ACTIVE") {
      const activeVariants = await tx.productVariant.count({ where: { productId, isActive: true } });
      if (activeVariants === 0) {
        return fail("Add an active variant before listing this product.", "status");
      }
    }

    if (fields.slug !== product.slug) {
      await assertSlugFree(tx, fields.slug, productId);
      // Reclaiming one of this product's own old slugs.
      await tx.productSlugRedirect.deleteMany({ where: { slug: fields.slug, productId } });
      // Only a slug that was public needs to keep working.
      if (product.publishedAt) {
        await tx.productSlugRedirect.create({ data: { slug: product.slug, productId } });
      }
    }

    await tx.product.update({
      where: { id: productId },
      data: {
        name: fields.name,
        slug: fields.slug,
        description: fields.description,
        collectionId: fields.collectionId,
        status: fields.status,
        publishedAt: product.publishedAt ?? (fields.status === "ACTIVE" ? new Date() : null),
        categories: { deleteMany: {}, create: categoryLinks(fields.categoryIds) },
      },
    });
    return { ok: true, id: productId };
  });
}
