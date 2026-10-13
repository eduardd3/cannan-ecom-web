import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createVariant, resetDb } from "../../../test/db";
import { createCategory, deleteCategory, updateCategory, type CategoryFields } from "./save";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

function fields(overrides: Partial<CategoryFields> = {}): CategoryFields {
  return { name: "Candles", slug: "candles", description: null, ...overrides };
}

async function created(overrides: Partial<CategoryFields> = {}) {
  const result = await createCategory(fields(overrides));
  if (!result.ok) throw new Error(`created: ${result.message}`);
  return result.id;
}

describe("createCategory", () => {
  it("creates a category", async () => {
    const id = await created({ description: "Seven-day candles." });
    const category = await prisma.category.findUniqueOrThrow({ where: { id } });
    expect(category).toMatchObject({ name: "Candles", slug: "candles", description: "Seven-day candles." });
  });

  it("refuses a name that differs only in case", async () => {
    await created();
    const result = await createCategory(fields({ name: "CANDLES", slug: "candles-2" }));
    expect(result).toMatchObject({ ok: false, field: "name" });
    expect(await prisma.category.count()).toBe(1);
  });

  it("refuses a taken slug", async () => {
    await created();
    const result = await createCategory(fields({ name: "Velas", slug: "candles" }));
    expect(result).toMatchObject({ ok: false, field: "slug" });
  });
});

describe("updateCategory", () => {
  it("keeps its own name and slug", async () => {
    const id = await created();
    const result = await updateCategory(id, fields({ name: "candles", description: "Updated." }));
    expect(result).toEqual({ ok: true, id });
    expect(await prisma.category.findUniqueOrThrow({ where: { id } })).toMatchObject({
      name: "candles",
      description: "Updated.",
    });
  });

  it("refuses another category's name or slug", async () => {
    await created();
    const id = await created({ name: "Saints", slug: "saints" });
    expect(await updateCategory(id, fields({ name: "Candles", slug: "saints" }))).toMatchObject({
      ok: false,
      field: "name",
    });
    expect(await updateCategory(id, fields({ name: "Saints", slug: "candles" }))).toMatchObject({
      ok: false,
      field: "slug",
    });
  });

  it("reports a deleted category", async () => {
    expect(await updateCategory(999, fields())).toMatchObject({ ok: false });
  });
});

describe("deleteCategory", () => {
  it("deletes an unused category", async () => {
    const id = await created();
    expect(await deleteCategory(id)).toEqual({ ok: true });
    expect(await prisma.category.count()).toBe(0);
  });

  it("refuses a category a product uses, and keeps the link", async () => {
    const id = await created();
    const variant = await createVariant({ stock: 1 });
    await prisma.productCategory.create({ data: { productId: variant.productId, categoryId: id } });

    expect(await deleteCategory(id)).toMatchObject({ ok: false });
    expect(await prisma.productCategory.count({ where: { categoryId: id } })).toBe(1);
  });

  it("treats an already-deleted category as done", async () => {
    expect(await deleteCategory(999)).toEqual({ ok: true });
  });
});
