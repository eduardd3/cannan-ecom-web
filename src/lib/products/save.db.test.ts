import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { getRedirectedSlug } from "@/lib/catalog/queries";
import { prisma } from "@/lib/prisma";
import { createVariant, resetDb } from "../../../test/db";
import { createProduct, updateProduct, type ProductFields } from "./save";

let collectionId: number;

beforeEach(async () => {
  await resetDb();
  collectionId = (await prisma.collection.findFirstOrThrow({ where: { isDefault: true } })).id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

function fields(overrides: Partial<ProductFields> = {}): ProductFields {
  return {
    name: "San Judas Candle",
    slug: "san-judas-candle",
    description: "A seven-day candle.",
    collectionId,
    categoryIds: [],
    ...overrides,
  };
}

async function created(overrides: Partial<ProductFields> = {}) {
  const result = await createProduct(fields(overrides));
  if (!result.ok) throw new Error(`created: ${result.message}`);
  return result.id;
}

/** A product that's listed (ACTIVE, so published) under `slug`. */
async function listedProduct(slug: string) {
  const variant = await createVariant({ stock: 1 });
  await prisma.product.update({ where: { id: variant.productId }, data: { slug, publishedAt: new Date() } });
  return variant.productId;
}

async function save(
  productId: number,
  overrides: Partial<ProductFields> & { status?: "DRAFT" | "ACTIVE" | "ARCHIVED"; featured?: boolean },
) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { categories: true },
  });
  return updateProduct(productId, {
    name: product.name,
    slug: product.slug,
    description: product.description,
    collectionId: product.collectionId,
    categoryIds: product.categories.map((link) => link.categoryId),
    status: product.status,
    ...overrides,
  });
}

async function redirectsOf(productId: number) {
  const rows = await prisma.productSlugRedirect.findMany({ where: { productId }, orderBy: { slug: "asc" } });
  return rows.map((row) => row.slug);
}

describe("createProduct", () => {
  it("creates a draft with its categories", async () => {
    const [candles, saints] = await Promise.all([
      prisma.category.create({ data: { slug: "candles", name: "Candles" } }),
      prisma.category.create({ data: { slug: "saints", name: "Saints" } }),
    ]);

    const id = await created({ categoryIds: [candles.id, saints.id, candles.id] });

    const product = await prisma.product.findUniqueOrThrow({ where: { id }, include: { categories: true } });
    expect(product).toMatchObject({ status: "DRAFT", publishedAt: null, slug: "san-judas-candle" });
    expect(product.categories.map((link) => link.categoryId).sort()).toEqual([candles.id, saints.id].sort());
  });

  it("refuses a slug another product uses now", async () => {
    await created();
    expect(await createProduct(fields({ name: "Other" }))).toMatchObject({ ok: false, field: "slug" });
  });

  it("refuses a slug that still redirects to another product", async () => {
    const id = await listedProduct("old-name");
    await save(id, { slug: "new-name" });

    expect(await createProduct(fields({ slug: "old-name" }))).toMatchObject({
      ok: false,
      field: "slug",
      message: expect.stringMatching(/still redirects/),
    });
  });

  it("refuses a category that doesn't exist", async () => {
    expect(await createProduct(fields({ categoryIds: [999] }))).toMatchObject({ ok: false, field: "categoryIds" });
    expect(await prisma.product.count()).toBe(0);
  });
});

describe("updateProduct: slugs", () => {
  it("keeps a listed product's old slug as a redirect to the new one", async () => {
    const id = await listedProduct("old-name");

    expect(await save(id, { slug: "new-name" })).toEqual({ ok: true, id });

    expect(await redirectsOf(id)).toEqual(["old-name"]);
    expect(await getRedirectedSlug("old-name")).toBe("new-name");
  });

  it("points every old slug straight at the current one after several renames", async () => {
    const id = await listedProduct("first");
    await save(id, { slug: "second" });
    await save(id, { slug: "third" });

    expect(await redirectsOf(id)).toEqual(["first", "second"]);
    expect(await getRedirectedSlug("first")).toBe("third");
    expect(await getRedirectedSlug("second")).toBe("third");
  });

  it("reclaims one of its own old slugs", async () => {
    const id = await listedProduct("first");
    await save(id, { slug: "second" });

    expect(await save(id, { slug: "first" })).toEqual({ ok: true, id });

    expect(await redirectsOf(id)).toEqual(["second"]);
    expect(await getRedirectedSlug("first")).toBeNull(); // current again, no redirect needed
  });

  it("keeps no redirect when a never-listed draft is renamed", async () => {
    const id = await created();
    await save(id, { slug: "renamed-draft" });
    expect(await redirectsOf(id)).toEqual([]);
  });

  it("refuses another product's old slug", async () => {
    const first = await listedProduct("shared-name");
    await save(first, { slug: "first-renamed" });
    const second = await created({ slug: "second" });

    expect(await save(second, { slug: "shared-name" })).toMatchObject({ ok: false, field: "slug" });
    expect(await getRedirectedSlug("shared-name")).toBe("first-renamed");
  });

  it("never leaves a slug both current and redirected when a rename and a claim race", async () => {
    const renamer = await listedProduct("contested");
    const claimer = await created({ slug: "claimer" });

    const [renamed, claimed] = await Promise.all([
      save(renamer, { slug: "renamed" }),
      save(claimer, { slug: "contested" }),
    ]);

    // Whichever ran second saw the slug held (as current or as a redirect).
    expect(renamed.ok).toBe(true);
    expect(claimed.ok).toBe(false);
    const current = await prisma.product.findUnique({ where: { slug: "contested" } });
    const redirect = await prisma.productSlugRedirect.findUnique({ where: { slug: "contested" } });
    expect(current === null || redirect === null).toBe(true);
  });
});

describe("updateProduct: status", () => {
  it("won't list a product with no active variant", async () => {
    const id = await created();
    expect(await save(id, { status: "ACTIVE" })).toMatchObject({ ok: false, field: "status" });
    expect((await prisma.product.findUniqueOrThrow({ where: { id } })).status).toBe("DRAFT");
  });

  it("stamps publishedAt on the first listing and keeps it after unlisting", async () => {
    const variant = await createVariant({ stock: 1 });
    const id = variant.productId;
    await prisma.product.update({ where: { id }, data: { status: "DRAFT", publishedAt: null } });

    expect(await save(id, { status: "ACTIVE" })).toEqual({ ok: true, id });
    const listed = await prisma.product.findUniqueOrThrow({ where: { id } });
    expect(listed.publishedAt).toBeInstanceOf(Date);

    await save(id, { status: "ARCHIVED" });
    const archived = await prisma.product.findUniqueOrThrow({ where: { id } });
    expect(archived.publishedAt).toEqual(listed.publishedAt);
  });

  it("doesn't keep the old slug when a draft is renamed and listed in the same save", async () => {
    const variant = await createVariant({ stock: 1 });
    const id = variant.productId;
    await prisma.product.update({ where: { id }, data: { status: "DRAFT", publishedAt: null, slug: "draft-slug" } });

    await save(id, { slug: "launch-slug", status: "ACTIVE" });

    expect(await redirectsOf(id)).toEqual([]);
  });
});

describe("updateProduct: featured", () => {
  it("sets and clears featured", async () => {
    const { productId } = await createVariant({ stock: 1 });

    await save(productId, { featured: true });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).featured).toBe(true);

    await save(productId, { featured: false });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).featured).toBe(false);
  });

  it("leaves featured alone when it's omitted", async () => {
    const { productId } = await createVariant({ stock: 1 });
    await prisma.product.update({ where: { id: productId }, data: { featured: true } });

    await save(productId, { name: "Renamed" });

    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).featured).toBe(true);
  });
});

describe("getRedirectedSlug", () => {
  it("doesn't redirect to a product that isn't listed", async () => {
    const id = await listedProduct("old-name");
    await save(id, { slug: "new-name", status: "ARCHIVED" });
    expect(await getRedirectedSlug("old-name")).toBeNull();
  });

  it("returns null for a slug that was never anyone's", async () => {
    expect(await getRedirectedSlug("nothing-here")).toBeNull();
  });
});
