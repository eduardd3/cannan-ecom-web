import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { getRedirectedSlug } from "@/lib/catalog/queries";
import { prisma } from "@/lib/prisma";
import { catalogRefs, createVariant, resetDb } from "../../../test/db";
import { createProduct, updateProduct, type ProductFields } from "./save";

let collectionId: number;
let productTypeId: number;

beforeEach(async () => {
  await resetDb();
  ({ collectionId, productTypeId } = await catalogRefs());
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
    productTypeId,
    categoryId: null,
    option1Name: null,
    option2Name: null,
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
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  return updateProduct(productId, {
    name: product.name,
    slug: product.slug,
    description: product.description,
    collectionId: product.collectionId,
    productTypeId: product.productTypeId,
    categoryId: product.categoryId,
    option1Name: product.option1Name,
    option2Name: product.option2Name,
    status: product.status,
    ...overrides,
  });
}

async function redirectsOf(productId: number) {
  const rows = await prisma.productSlugRedirect.findMany({ where: { productId }, orderBy: { slug: "asc" } });
  return rows.map((row) => row.slug);
}

describe("createProduct", () => {
  it("creates a draft with its type, category, and option names", async () => {
    const category = await prisma.category.create({ data: { slug: "san-judas", name: "San Judas", collectionId } });

    const id = await created({ categoryId: category.id, option1Name: "Color", option2Name: "Size" });

    expect(await prisma.product.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status: "DRAFT",
      publishedAt: null,
      slug: "san-judas-candle",
      productTypeId,
      categoryId: category.id,
      option1Name: "Color",
      option2Name: "Size",
    });
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

  it("refuses a category or type that doesn't exist", async () => {
    expect(await createProduct(fields({ categoryId: 999 }))).toMatchObject({ ok: false, field: "categoryId" });
    expect(await createProduct(fields({ productTypeId: 999 }))).toMatchObject({ ok: false, field: "productTypeId" });
    expect(await prisma.product.count()).toBe(0);
  });

  it("refuses a category from another collection", async () => {
    const other = await prisma.collection.findFirstOrThrow({ where: { isDefault: false } });
    const category = await prisma.category.create({ data: { slug: "oshun", name: "Oshún", collectionId: other.id } });

    expect(await createProduct(fields({ categoryId: category.id }))).toMatchObject({ ok: false, field: "categoryId" });
  });
});

describe("updateProduct: option names", () => {
  it("renames options on a product with variants", async () => {
    const { productId } = await createVariant({ stock: 0 });
    await prisma.product.update({ where: { id: productId }, data: { option1Name: "Size" } });

    expect(await save(productId, { option1Name: "Talla" })).toEqual({ ok: true, id: productId });
  });

  it("won't add or remove an option once there are variants", async () => {
    const { productId } = await createVariant({ stock: 0 }); // a default variant, no options

    expect(await save(productId, { option1Name: "Size" })).toMatchObject({ ok: false, field: "option1Name" });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).option1Name).toBeNull();
  });

  it("changes options freely before there are variants", async () => {
    const id = await created();
    expect(await save(id, { option1Name: "Color", option2Name: "Size" })).toEqual({ ok: true, id });
    expect(await save(id, { option1Name: null, option2Name: null })).toEqual({ ok: true, id });
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
