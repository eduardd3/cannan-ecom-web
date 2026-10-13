import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { createVariant, resetDb } from "../../../test/db";
import { MAX_IMAGES_PER_PRODUCT } from "./image-fields";
import { addProductImage, deleteProductImage, moveProductImage, requestImageUpload, updateProductImage } from "./images";

// Key checks stay real; only the two calls that would reach S3 are faked.
const storage = vi.hoisted(() => ({ deleteImage: vi.fn(), createUploadUrl: vi.fn() }));
vi.mock("@/lib/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage")>()),
  deleteImage: storage.deleteImage,
  createUploadUrl: storage.createUploadUrl,
}));

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubEnv("S3_KEY_PREFIX", "dev");
  storage.deleteImage.mockResolvedValue(undefined);
  storage.createUploadUrl.mockResolvedValue({ url: "https://s3.example/put", key: "k", headers: {} });
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const keyFor = (productId: number) => `dev/products/${productId}/${randomUUID()}.jpg`;

async function add(productId: number, overrides: { variantId?: number | null; alt?: string } = {}) {
  const result = await addProductImage({ productId, key: keyFor(productId), alt: "A candle", variantId: null, ...overrides });
  if (!result.ok) throw new Error(`add: ${result.message}`);
  return result.id;
}

async function order(productId: number) {
  const rows = await prisma.productImage.findMany({
    where: { productId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

describe("addProductImage", () => {
  it("appends after the existing images", async () => {
    const { productId } = await createVariant({ stock: 0 });
    const first = await add(productId);
    const second = await add(productId, { alt: "Side view" });

    expect(await order(productId)).toEqual([first, second]);
    expect(await prisma.productImage.findUniqueOrThrow({ where: { id: second } })).toMatchObject({
      alt: "Side view",
      position: 1,
    });
  });

  it("tags a variant of the same product, but not another product's", async () => {
    const own = await createVariant({ stock: 0 });
    const other = await createVariant({ stock: 0 });

    const id = await add(own.productId, { variantId: own.id });
    expect((await prisma.productImage.findUniqueOrThrow({ where: { id } })).variantId).toBe(own.id);

    expect(
      await addProductImage({ productId: own.productId, key: keyFor(own.productId), alt: "x", variantId: other.id }),
    ).toMatchObject({ ok: false, field: "variantId" });
  });

  it("refuses a key that wasn't issued for this product", async () => {
    const { productId } = await createVariant({ stock: 0 });
    const other = await createVariant({ stock: 0 });

    for (const key of [keyFor(other.productId), "products/virgen/1.jpg", `prod/products/${productId}/${randomUUID()}.jpg`]) {
      expect(await addProductImage({ productId, key, alt: "x", variantId: null }), key).toMatchObject({
        ok: false,
        field: "file",
      });
    }
    expect(await prisma.productImage.count()).toBe(0);
  });

  it("refuses saving the same upload twice", async () => {
    const { productId } = await createVariant({ stock: 0 });
    const key = keyFor(productId);
    await addProductImage({ productId, key, alt: "x", variantId: null });
    expect(await addProductImage({ productId, key, alt: "x", variantId: null })).toMatchObject({ ok: false });
    expect(await prisma.productImage.count()).toBe(1);
  });

  it(`stops at ${MAX_IMAGES_PER_PRODUCT} images, including concurrent saves`, async () => {
    const { productId } = await createVariant({ stock: 0 });
    for (let i = 0; i < MAX_IMAGES_PER_PRODUCT - 1; i++) await add(productId);

    const results = await Promise.all([1, 2, 3].map(() =>
      addProductImage({ productId, key: keyFor(productId), alt: "x", variantId: null }),
    ));

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(await prisma.productImage.count({ where: { productId } })).toBe(MAX_IMAGES_PER_PRODUCT);
  });
});

describe("requestImageUpload", () => {
  it("issues a URL for a product with room", async () => {
    const { productId } = await createVariant({ stock: 0 });
    expect(await requestImageUpload({ productId, contentType: "image/png", size: 100 })).toMatchObject({ ok: true });
    expect(storage.createUploadUrl).toHaveBeenCalledWith({ productId, contentType: "image/png", size: 100 });
  });

  it("refuses a full product without issuing a URL", async () => {
    const { productId } = await createVariant({ stock: 0 });
    for (let i = 0; i < MAX_IMAGES_PER_PRODUCT; i++) await add(productId);

    expect(await requestImageUpload({ productId, contentType: "image/png", size: 100 })).toMatchObject({
      ok: false,
      field: "file",
    });
    expect(storage.createUploadUrl).not.toHaveBeenCalled();
  });

  it("reports a storage failure as a message, not a crash", async () => {
    const { productId } = await createVariant({ stock: 0 });
    storage.createUploadUrl.mockRejectedValueOnce(new Error('Storage: content type "text/html" is not allowed'));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    expect(await requestImageUpload({ productId, contentType: "text/html", size: 100 })).toMatchObject({ ok: false });
  });
});

describe("updateProductImage", () => {
  it("changes alt text and variant", async () => {
    const variant = await createVariant({ stock: 0 });
    const id = await add(variant.productId);

    expect(await updateProductImage(id, { alt: "Front", variantId: variant.id })).toEqual({ ok: true, id });
    expect(await prisma.productImage.findUniqueOrThrow({ where: { id } })).toMatchObject({
      alt: "Front",
      variantId: variant.id,
    });
  });
});

describe("moveProductImage", () => {
  it("swaps neighbors and renumbers, even from tied positions", async () => {
    const { productId } = await createVariant({ stock: 0 });
    const [a, b, c] = [await add(productId), await add(productId), await add(productId)];
    await prisma.productImage.updateMany({ where: { productId }, data: { position: 0 } }); // like the seed

    await moveProductImage(c, "up");
    expect(await order(productId)).toEqual([a, c, b]);

    await moveProductImage(a, "down");
    expect(await order(productId)).toEqual([c, a, b]);
    const positions = await prisma.productImage.findMany({ where: { productId }, select: { position: true } });
    expect(positions.map((row) => row.position).sort()).toEqual([0, 1, 2]);
  });

  it("does nothing past either end", async () => {
    const { productId } = await createVariant({ stock: 0 });
    const [a, b] = [await add(productId), await add(productId)];

    expect(await moveProductImage(a, "up")).toEqual({ ok: true, id: a });
    expect(await moveProductImage(b, "down")).toEqual({ ok: true, id: b });
    expect(await order(productId)).toEqual([a, b]);
  });
});

describe("deleteProductImage", () => {
  it("deletes the row, then the file", async () => {
    const { productId } = await createVariant({ stock: 0 });
    const id = await add(productId);
    const { key } = await prisma.productImage.findUniqueOrThrow({ where: { id } });

    expect(await deleteProductImage(id)).toEqual({ ok: true, id });
    expect(await prisma.productImage.count()).toBe(0);
    expect(storage.deleteImage).toHaveBeenCalledWith(key);
  });

  it("still removes the row when the file delete fails", async () => {
    const { productId } = await createVariant({ stock: 0 });
    const id = await add(productId);
    storage.deleteImage.mockRejectedValueOnce(new Error("AccessDenied"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    expect(await deleteProductImage(id)).toEqual({ ok: true, id });
    expect(await prisma.productImage.count()).toBe(0);
  });

  it("treats an already-deleted image as done", async () => {
    expect(await deleteProductImage(999)).toEqual({ ok: true, id: 999 });
    expect(storage.deleteImage).not.toHaveBeenCalled();
  });
});
