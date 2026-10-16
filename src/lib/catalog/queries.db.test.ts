import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createVariant, resetDb } from "../../../test/db";
import { listCollections, listFeaturedProducts } from "./queries";

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
