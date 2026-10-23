import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { checkStockConsistency } from "@/lib/inventory/adjust";
import { prisma } from "@/lib/prisma";
import { catalogRefs, createUser, createVariant, resetDb } from "../../../test/db";
import { updateProduct } from "./save";
import type { OptionValues } from "./variant-fields";
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

const DEFAULT: OptionValues = { option1Value: null, option2Value: null };
const size = (value: string): OptionValues => ({ option1Value: value, option2Value: null });
const colorSize = (color: string, inches: string): OptionValues => ({ option1Value: color, option2Value: inches });

function fields(overrides: Partial<VariantFields> = {}): VariantFields {
  sequence += 1;
  return { option: DEFAULT, priceCents: 2499, sku: `NEW-${sequence}`, amazonAsin: null, position: null, ...overrides };
}

/** A draft product with no variants, and the given option names. */
async function emptyProduct(option1Name: string | null = null, option2Name: string | null = null) {
  sequence += 1;
  return prisma.product.create({
    data: {
      slug: `empty-${sequence}`,
      name: `Empty ${sequence}`,
      description: "x",
      option1Name,
      option2Name,
      ...(await catalogRefs()),
    },
  });
}

async function add(productId: number, overrides: Partial<VariantFields> = {}, openingStock = 0) {
  const result = await createProductVariant(productId, { ...fields(overrides), openingStock }, adminId);
  if (!result.ok) throw new Error(`add: ${result.message}`);
  return result.id;
}

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
    const product = await emptyProduct("Size");
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

  it("refuses the same options twice, ignoring case", async () => {
    const product = await emptyProduct("Color", "Size");
    await add(product.id, { option: colorSize("Roja", "12 in") });
    await add(product.id, { option: colorSize("Roja", "8 in") }); // shares only one value: fine

    expect(await createProductVariant(product.id, { ...fields({ option: colorSize("ROJA", "12 IN") }), openingStock: 0 }, adminId))
      .toMatchObject({ ok: false, field: "option" });
  });

  it("requires a value for each of the product's option names, and no others", async () => {
    const sized = await emptyProduct("Size");
    expect(await createProductVariant(sized.id, { ...fields(), openingStock: 0 }, adminId)).toMatchObject({
      ok: false,
      field: "option",
      message: "Enter a Size.",
    });
    expect(await createProductVariant(sized.id, { ...fields({ option: colorSize("M", "Extra") }), openingStock: 0 }, adminId))
      .toMatchObject({ ok: false, field: "option" });

    const plain = await emptyProduct();
    expect(await createProductVariant(plain.id, { ...fields({ option: size("M") }), openingStock: 0 }, adminId))
      .toMatchObject({ ok: false, field: "option" });
  });

  it("allows one variant on a product without options", async () => {
    const product = await emptyProduct();
    await add(product.id);

    expect(await createProductVariant(product.id, { ...fields(), openingStock: 0 }, adminId)).toMatchObject({
      ok: false,
      field: "option",
      message: expect.stringMatching(/no options/),
    });
  });
});

describe("updateProductVariant", () => {
  it("edits everything but stock", async () => {
    const product = await emptyProduct("Size");
    const id = await add(product.id, { option: size("M") }, 3);

    const result = await updateProductVariant(
      id,
      fields({ option: size("Medium"), priceCents: 1999, sku: "RENAMED", amazonAsin: "B0XYZ98765", position: 7 }),
    );

    expect(result).toEqual({ ok: true, id });
    expect(await prisma.productVariant.findUniqueOrThrow({ where: { id } })).toMatchObject({
      option1Value: "Medium",
      option2Value: null,
      priceCents: 1999,
      sku: "RENAMED",
      amazonAsin: "B0XYZ98765",
      position: 7,
      stock: 3,
    });
  });

  it("keeps its own SKU and options without tripping the duplicate checks", async () => {
    const product = await emptyProduct("Size");
    const id = await add(product.id, { option: size("M"), sku: "KEEP-ME" });
    expect(await updateProductVariant(id, fields({ option: size("m"), sku: "KEEP-ME", priceCents: 100 }))).toEqual({
      ok: true,
      id,
    });
  });

  it("refuses a sibling's options or another variant's SKU", async () => {
    const product = await emptyProduct("Size");
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
    const product = await emptyProduct("Size");
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

  it("won't turn on a variant that doesn't match the product's options", async () => {
    // e.g. an old default variant left off when the seed gave its product options
    const product = await emptyProduct();
    const original = await add(product.id);
    await setVariantActive(original, false);
    await prisma.product.update({ where: { id: product.id }, data: { option1Name: "Size" } });

    expect(await setVariantActive(original, true)).toMatchObject({ ok: false, field: "isActive" });
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
        productTypeId: product.productTypeId,
        categoryId: null,
        option1Name: null,
        option2Name: null,
        status: "ACTIVE",
      }),
      setVariantActive(id, false),
    ]);

    expect([listed.ok, toggled.ok].filter(Boolean)).toHaveLength(1);
    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id }, include: { variants: true } });
    if (after.status === "ACTIVE") expect(after.variants.some((variant) => variant.isActive)).toBe(true);
  });
});

// The constraints the migration adds by hand, which Prisma's schema can't express.
describe("database constraints", () => {
  async function insert(productId: number, data: Partial<OptionValues> & Record<string, unknown> = {}) {
    sequence += 1;
    return prisma.productVariant.create({ data: { productId, sku: `RAW-${sequence}`, priceCents: 100, stock: 0, ...data } });
  }

  it("allows one default (null, null) variant per product", async () => {
    const product = await emptyProduct();
    await insert(product.id);
    await expect(insert(product.id)).rejects.toThrow();
  });

  it("refuses option 2 without option 1", async () => {
    const product = await emptyProduct("Color", "Size");
    await expect(insert(product.id, { option2Value: "12 in" })).rejects.toThrow();
    await expect(
      prisma.product.update({ where: { id: product.id }, data: { option1Name: null } }),
    ).rejects.toThrow();
  });

  it("takes dimensions all or none, each above zero", async () => {
    const product = await emptyProduct("Size");
    await insert(product.id, { option1Value: "8 in", heightIn: 8, widthIn: 3.5, depthIn: 3 });
    await expect(insert(product.id, { option1Value: "10 in", heightIn: 10 })).rejects.toThrow();
    await expect(insert(product.id, { option1Value: "12 in", heightIn: 12, widthIn: 0, depthIn: 4 })).rejects.toThrow();
  });
});
