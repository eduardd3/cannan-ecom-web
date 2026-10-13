// lib/categories/save.ts
//
// Creating, editing, and deleting categories. Server actions in ./actions call
// these after requireStaff() and after parsing the form; keeping them out of
// the "use server" file means they aren't public endpoints and can be tested
// against a real database.
import "server-only";

import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export type CategoryFields = {
  name: string;
  slug: string; // already validated with slugProblem
  description: string | null;
};

export type CategoryField = keyof CategoryFields;

type Failure = { ok: false; field?: CategoryField; message: string };

export type SaveCategoryResult = { ok: true; id: number } | Failure;

export type DeleteCategoryResult = { ok: true } | { ok: false; message: string };

// Thrown inside a transaction to roll it back while still returning a result.
class Rollback extends Error {
  constructor(readonly result: Failure) {
    super(result.message);
  }
}

function fail(message: string, field?: CategoryField): Failure {
  return { ok: false, field, message };
}

async function run(fn: (tx: Prisma.TransactionClient) => Promise<SaveCategoryResult>): Promise<SaveCategoryResult> {
  try {
    return await prisma.$transaction(fn);
  } catch (err) {
    if (err instanceof Rollback) return err.result;
    // Backstop for assertUnique: the unique index on slug.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("Another category just took that slug. Pick a different one.", "slug");
    }
    throw err;
  }
}

/**
 * Serializes category writes. Names are unique ignoring case, which no index
 * enforces; without this, two saves of "Candles" and "candles" could both
 * pass the check and commit.
 */
async function lockCategories(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('category-names'))`;
}

/** Refuses a name (ignoring case) or slug that another category already has. */
async function assertUnique(tx: Prisma.TransactionClient, fields: CategoryFields, categoryId: number | null) {
  const others = categoryId === null ? undefined : { not: categoryId };
  const [byName, bySlug] = await Promise.all([
    tx.category.findFirst({
      where: { id: others, name: { equals: fields.name, mode: "insensitive" } },
      select: { name: true },
    }),
    tx.category.findFirst({ where: { id: others, slug: fields.slug }, select: { name: true } }),
  ]);
  if (byName) throw new Rollback(fail(`"${byName.name}" already exists.`, "name"));
  if (bySlug) throw new Rollback(fail(`"${bySlug.name}" already uses that slug.`, "slug"));
}

export async function createCategory(fields: CategoryFields): Promise<SaveCategoryResult> {
  return run(async (tx) => {
    await lockCategories(tx);
    await assertUnique(tx, fields, null);
    const category = await tx.category.create({ data: fields, select: { id: true } });
    return { ok: true, id: category.id };
  });
}

/**
 * Slug changes aren't redirected: the slug only appears in storefront filter
 * links (?category=), and an unknown one shows the unfiltered list.
 */
export async function updateCategory(categoryId: number, fields: CategoryFields): Promise<SaveCategoryResult> {
  return run(async (tx) => {
    await lockCategories(tx);
    const existing = await tx.category.findUnique({ where: { id: categoryId }, select: { id: true } });
    if (!existing) return fail("This category no longer exists.");
    await assertUnique(tx, fields, categoryId);
    await tx.category.update({ where: { id: categoryId }, data: fields });
    return { ok: true, id: categoryId };
  });
}

/**
 * Only an unused category can be deleted: ProductCategory cascades, so
 * deleting one in use would silently take it off its products.
 */
export async function deleteCategory(categoryId: number): Promise<DeleteCategoryResult> {
  return prisma.$transaction(async (tx) => {
    // FOR UPDATE blocks a product save from linking the category (its foreign
    // key check takes a share lock on this row) between the count and the delete.
    const rows = await tx.$queryRaw<{ id: number }[]>`
      SELECT "id" FROM "Category" WHERE "id" = ${categoryId} FOR UPDATE`;
    if (rows.length === 0) return { ok: true }; // already gone

    const inUse = await tx.productCategory.count({ where: { categoryId } });
    if (inUse > 0) {
      return {
        ok: false,
        message: `Used by ${inUse} ${inUse === 1 ? "product" : "products"}. Remove it from them first.`,
      };
    }
    await tx.category.delete({ where: { id: categoryId } });
    return { ok: true };
  });
}
