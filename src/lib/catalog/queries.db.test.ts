import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createVariant, resetDb } from "../../../test/db";
import {
  getCollectionListing,
  getDefaultCollectionTarget,
  getProductBySlug,
  listCollections,
  listFeaturedProducts,
  listSwitcherCollections,
} from "./queries";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

/** Creates `count` visible products, oldest first, and returns their slugs. */
async function products(count: number) {
  const slugs: string[] = [];
  for (let i = 0; i < count; i++) {
    const { productId } = await createVariant({ stock: 1 });
    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId }, select: { slug: true } });
    slugs.push(product.slug);
  }
  return slugs;
}

async function feature(slug: string) {
  await prisma.product.update({ where: { slug }, data: { featured: true } });
}

describe("listFeaturedProducts", () => {
  it("puts featured products first, then tops up with the newest", async () => {
    const [a, b, c, d] = await products(4);
    await feature(a);
    await feature(c);

    const slugs = (await listFeaturedProducts()).map((p) => p.slug);

    expect(slugs).toEqual([c, a, d, b]);
  });

  it("returns at most 8", async () => {
    await products(10);
    expect(await listFeaturedProducts()).toHaveLength(8);
  });

  it("skips products that aren't visible, even when featured", async () => {
    const [draft, visible] = await products(2);
    await feature(draft);
    await prisma.product.update({ where: { slug: draft }, data: { status: "DRAFT" } });

    const slugs = (await listFeaturedProducts()).map((p) => p.slug);

    expect(slugs).toEqual([visible]);
  });

  it("returns an empty list when there are no products", async () => {
    expect(await listFeaturedProducts()).toEqual([]);
  });
});

describe("listCollections", () => {
  it("lists every collection in position order", async () => {
    const expected = await prisma.collection.findMany({ orderBy: { position: "asc" }, select: { slug: true } });

    const slugs = (await listCollections()).map((c) => c.slug);

    expect(slugs).toEqual(expected.map((c) => c.slug));
    expect(slugs.length).toBeGreaterThan(0);
  });
});

async function defaultCollection() {
  return prisma.collection.findFirstOrThrow({ where: { isDefault: true }, select: { id: true, slug: true } });
}

describe("getCollectionListing", () => {
  it("returns the collection's visible products, newest first", async () => {
    const [older, draft, newer] = await products(3);
    await prisma.product.update({ where: { slug: draft }, data: { status: "DRAFT" } });
    const { slug } = await defaultCollection();

    const listing = await getCollectionListing(slug);

    expect(listing?.collection.slug).toBe(slug);
    expect(listing?.products.map((p) => p.slug)).toEqual([newer, older]);
  });

  it("leaves out inactive variants", async () => {
    const variant = await createVariant({ stock: 1, priceCents: 2000 });
    await prisma.product.update({ where: { id: variant.productId }, data: { option1Name: "Color" } });
    await prisma.productVariant.update({ where: { id: variant.id }, data: { option1Value: "Roja" } });
    await prisma.productVariant.create({
      data: { productId: variant.productId, sku: "SKU-OFF", priceCents: 900, stock: 0, isActive: false, option1Value: "Blanca" },
    });
    const { slug } = await defaultCollection();

    const listing = await getCollectionListing(slug);

    expect(listing?.products[0].variants).toEqual([
      { id: variant.id, priceCents: 2000, stock: 1, option1Value: "Roja", option2Value: null },
    ]);
  });

  it("returns null for an unknown slug", async () => {
    await products(1);
    expect(await getCollectionListing("no-such-collection")).toBeNull();
  });

  it("returns null for a collection with nothing visible", async () => {
    const [slug] = await products(1);
    await prisma.product.update({ where: { slug }, data: { status: "DRAFT" } });
    expect(await getCollectionListing((await defaultCollection()).slug)).toBeNull();
  });
});

describe("listSwitcherCollections", () => {
  it("lists only collections with a visible product", async () => {
    await products(1);
    expect(await listSwitcherCollections()).toEqual([
      expect.objectContaining({ slug: (await defaultCollection()).slug }),
    ]);
  });
});

describe("getDefaultCollectionTarget", () => {
  it("returns the default collection's slug and category slugs", async () => {
    await products(1);
    const { id, slug } = await defaultCollection();
    await prisma.category.create({ data: { slug: "guadalupe", name: "Guadalupe", collectionId: id } });

    expect(await getDefaultCollectionTarget()).toEqual({ slug, categorySlugs: ["guadalupe"] });
  });

  it("returns null while the default collection has nothing visible", async () => {
    expect(await getDefaultCollectionTarget()).toBeNull();
  });
});

describe("getProductBySlug", () => {
  it("returns active variants by position, with formatted dimensions", async () => {
    const first = await createVariant({ stock: 1 });
    const product = await prisma.product.update({
      where: { id: first.productId },
      data: { option1Name: "Size", material: "Resin" },
      select: { slug: true },
    });
    await prisma.productVariant.update({
      where: { id: first.id },
      data: { option1Value: "12 in", position: 2, heightIn: "8.00", widthIn: "3.50", depthIn: "3" },
    });
    const earlier = await prisma.productVariant.create({
      data: { productId: first.productId, sku: "SKU-8", priceCents: 900, stock: 0, option1Value: "8 in", position: 1 },
    });
    await prisma.productVariant.create({
      data: { productId: first.productId, sku: "SKU-OFF", priceCents: 900, stock: 0, isActive: false, option1Value: "4 in" },
    });

    const view = await getProductBySlug(product.slug);

    expect(view?.material).toBe("Resin");
    expect(view?.variants.map((v) => [v.id, v.dimensions])).toEqual([
      [earlier.id, null],
      [first.id, "8 × 3.5 × 3 in"],
    ]);
  });

  it("shows the Type filter only when the collection has more than one visible type", async () => {
    const [a, b] = await products(2);
    expect((await getProductBySlug(a))?.collection.typeFilterVisible).toBe(false);

    const other = await prisma.productType.findFirstOrThrow({ orderBy: { position: "desc" } });
    await prisma.product.update({ where: { slug: b }, data: { productTypeId: other.id } });
    expect((await getProductBySlug(a))?.collection.typeFilterVisible).toBe(true);

    await prisma.product.update({ where: { slug: b }, data: { status: "DRAFT" } });
    expect((await getProductBySlug(a))?.collection.typeFilterVisible).toBe(false);
  });
});
