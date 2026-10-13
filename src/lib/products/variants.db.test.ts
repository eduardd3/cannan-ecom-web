import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { checkStockConsistency } from "@/lib/inventory/adjust";
import { prisma } from "@/lib/prisma";
import { createUser, createVariant, resetDb } from "../../../test/db";
import { updateProduct } from "./save";
import { createProductVariant, setVariantActive, updateProductVariant, type VariantFields } from "./variants";

let adminId: number;

beforeEach(async () => {
  await resetDb();
  adminId = (await createUser("ADMIN")).id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

let sequence = 0;

function fields(overrides: Partial<VariantFields> = {}): VariantFields {
  sequence += 1;
  return { option: null, priceCents: 2499, sku: `NEW-${sequence}`, amazonAsin: null, position: null, ...overrides };
}

/** A draft product with no variants. */
async function emptyProduct() {
  const collection = await prisma.collection.findFirstOrThrow({ where: { isDefault: true } });
  sequence += 1;
  return prisma.product.create({
    data: { slug: `empty-${sequence}`, name: `Empty ${sequence}`, description: "x", collectionId: collection.id },
  });
}

async function add(productId: number, overrides: Partial<VariantFields> = {}, openingStock = 0) {
  const result = await createProductVariant(productId, { ...fields(overrides), openingStock }, adminId);
  if (!result.ok) throw new Error(`add: ${result.message}`);
  return result.id;
}

const size = (value: string) => ({ name: "Size", value });

describe("createProductVariant", () => {
  it("writes opening stock through the ledger as INITIAL_STOCK", async () => {
    const product = await emptyProduct();

    const id = await add(product.id, { sku: "CNN-SJ-7DAY", priceCents: 1299, amazonAsin: "B0ABC12345" }, 12);

    const variant = await prisma.productVariant.findUniqueOrThrow({ where: { id } });
    expect(variant).toMatchObject({ sku: "CNN-SJ-7DAY", priceCents: 1299, amazonAsin: "B0ABC12345", stock: 12, isActive: true });
    const ledger = await prisma.inventoryAdjustment.findMany({ where: { variantId: id } });
    expect(ledger).toMatchObject([{ delta: 12, stockAfter: 12, reason: "INITIAL_STOCK", createdById: adminId }]);
    expect((await checkStockConsistency(id))?.consistent).toBe(true);
  });

  it("writes no ledger row for zero opening stock", async () => {
    const product = await emptyProduct();
    const id = await add(product.id);
    expect(await prisma.inventoryAdjustment.count({ where: { variantId: id } })).toBe(0);
  });

  it("puts a variant without a position after the others", async () => {
    const product = await emptyProduct();
    await add(product.id, { option: size("S"), position: 4 });
    const id = await add(product.id, { option: size("M") });
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id } })).position).toBe(5);
  });

  it("refuses a SKU another variant uses, and writes nothing", async () => {
    const existing = await createVariant({ stock: 0 });
    const product = await emptyProduct();

    const result = await createProductVariant(product.id, { ...fields({ sku: existing.sku }), openingStock: 5 }, adminId);

    expect(result).toMatchObject({ ok: false, field: "sku" });
    expect(await prisma.productVariant.count({ where: { productId: product.id } })).toBe(0);
  });

  it("refuses the same option twice, ignoring case", async () => {
    const product = await emptyProduct();
    await add(product.id, { option: size("Large") });
    expect(await createProductVariant(product.id, { ...fields({ option: { name: "size", value: "LARGE" } }), openingStock: 0 }, adminId))
      .toMatchObject({ ok: false, field: "option" });
  });

  it("allows one active default variant and no options next to it", async () => {
    const product = await emptyProduct();
    await add(product.id);

    expect(await createProductVariant(product.id, { ...fields(), openingStock: 0 }, adminId)).toMatchObject({
      ok: false,
      message: expect.stringMatching(/already has an active default/),
    });
    expect(await createProductVariant(product.id, { ...fields({ option: size("M") }), openingStock: 0 }, adminId)).toMatchObject({
      ok: false,
      message: expect.stringMatching(/default variant with no option/),
    });
  });

  it("refuses a default variant next to named options", async () => {
    const product = await emptyProduct();
    await add(product.id, { option: size("M") });
    expect(await createProductVariant(product.id, { ...fields(), openingStock: 0 }, adminId)).toMatchObject({
      ok: false,
      field: "option",
    });
  });

  it("allows switching from a default variant to options once the default is off", async () => {
    const product = await emptyProduct();
    const original = await add(product.id);
    expect(await setVariantActive(original, false)).toEqual({ ok: true, id: original });

    await add(product.id, { option: size("S") });
    await add(product.id, { option: size("M") });

    // Turning the old default back on would mix it with the options.
    expect(await setVariantActive(original, true)).toMatchObject({ ok: false, field: "isActive" });
  });
});

describe("updateProductVariant", () => {
  it("edits everything but stock", async () => {
    const product = await emptyProduct();
    const id = await add(product.id, { option: size("M") }, 3);

    const result = await updateProductVariant(
      id,
      fields({ option: size("Medium"), priceCents: 1999, sku: "RENAMED", amazonAsin: "B0XYZ98765", position: 7 }),
    );

    expect(result).toEqual({ ok: true, id });
    expect(await prisma.productVariant.findUniqueOrThrow({ where: { id } })).toMatchObject({
      name: "Size",
      value: "Medium",
      priceCents: 1999,
      sku: "RENAMED",
      amazonAsin: "B0XYZ98765",
      position: 7,
      stock: 3,
    });
  });

  it("keeps its own SKU and option without tripping the duplicate checks", async () => {
    const product = await emptyProduct();
    const id = await add(product.id, { option: size("M"), sku: "KEEP-ME" });
    expect(await updateProductVariant(id, fields({ option: size("m"), sku: "KEEP-ME", priceCents: 100 }))).toEqual({
      ok: true,
      id,
    });
  });

  it("refuses a sibling's option or another variant's SKU", async () => {
    const product = await emptyProduct();
    await add(product.id, { option: size("S"), sku: "TAKEN" });
    const id = await add(product.id, { option: size("M") });

    expect(await updateProductVariant(id, fields({ option: size("S") }))).toMatchObject({ ok: false, field: "option" });
    expect(await updateProductVariant(id, fields({ option: size("M"), sku: "TAKEN" }))).toMatchObject({
      ok: false,
      field: "sku",
    });
  });

  it("keeps the position when none is given", async () => {
    const product = await emptyProduct();
    const id = await add(product.id, { position: 3 });
    await updateProductVariant(id, fields({ position: null }));
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id } })).position).toBe(3);
  });
});

describe("setVariantActive", () => {
  it("won't turn off a listed product's only active variant", async () => {
    const variant = await createVariant({ stock: 2 }); // its product is ACTIVE

    const result = await setVariantActive(variant.id, false);

    expect(result).toMatchObject({ ok: false, field: "isActive", message: expect.stringMatching(/Unlist the product/) });
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).isActive).toBe(true);
  });

  it("turns off one of several active variants on a listed product", async () => {
    const product = await emptyProduct();
    const small = await add(product.id, { option: size("S") });
    await add(product.id, { option: size("M") });
    await prisma.product.update({ where: { id: product.id }, data: { status: "ACTIVE", publishedAt: new Date() } });

    expect(await setVariantActive(small, false)).toEqual({ ok: true, id: small });
  });

  it("turns off the last variant of an unlisted product", async () => {
    const product = await emptyProduct();
    const id = await add(product.id);
    expect(await setVariantActive(id, false)).toEqual({ ok: true, id });
  });

  it("can't race a listing: the product never ends up listed with no active variant", async () => {
    const product = await emptyProduct();
    const id = await add(product.id);

    // Both lock the product row, so whichever runs second sees the other's result.
    const [listed, toggled] = await Promise.all([
      updateProduct(product.id, {
        name: product.name,
        slug: product.slug,
        description: product.description,
        collectionId: product.collectionId,
        categoryIds: [],
        status: "ACTIVE",
      }),
      setVariantActive(id, false),
    ]);

    expect([listed.ok, toggled.ok].filter(Boolean)).toHaveLength(1);
    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id }, include: { variants: true } });
    if (after.status === "ACTIVE") expect(after.variants.some((variant) => variant.isActive)).toBe(true);
  });
});
