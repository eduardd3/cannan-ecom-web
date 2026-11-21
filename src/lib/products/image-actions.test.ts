import { beforeEach, describe, expect, it, vi } from "vitest";

import { revalidatePath } from "next/cache";
import { invalidateCatalog } from "@/lib/catalog/cache";
import { deleteImageAction, moveImageAction, saveImageAction, updateImageAction } from "./image-actions";
import { addProductImage, deleteProductImage, moveProductImage, updateProductImage } from "./images";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireStaff: vi.fn(async () => ({ id: 1 })) }));
vi.mock("@/lib/catalog/cache", () => ({ invalidateCatalog: vi.fn() }));
vi.mock("./images", () => ({
  addProductImage: vi.fn(),
  updateProductImage: vi.fn(),
  moveProductImage: vi.fn(),
  deleteProductImage: vi.fn(),
  requestImageUpload: vi.fn(),
}));

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("image actions", () => {
  it("saveImageAction invalidates the catalog after a save", async () => {
    vi.mocked(addProductImage).mockResolvedValue({ ok: true, id: 5 });
    const result = await saveImageAction({ productId: 7, key: "products/7/front.jpg", alt: "Front", variantId: "" });
    expect(result).toEqual({ ok: true });
    expect(invalidateCatalog).toHaveBeenCalledOnce();
    expect(revalidatePath).not.toHaveBeenCalledWith("/products", "layout");
  });

  it("updateImageAction invalidates the catalog after a save", async () => {
    vi.mocked(updateProductImage).mockResolvedValue({ ok: true, id: 5 });
    expect(await updateImageAction(null, form({ imageId: "5", alt: "Front", variantId: "" }))).toEqual({ ok: true });
    expect(invalidateCatalog).toHaveBeenCalledOnce();
  });

  it("moveImageAction invalidates the catalog after a move", async () => {
    vi.mocked(moveProductImage).mockResolvedValue({ ok: true, id: 5 });
    expect(await moveImageAction(null, form({ imageId: "5", direction: "up" }))).toEqual({ ok: true });
    expect(invalidateCatalog).toHaveBeenCalledOnce();
  });

  it("deleteImageAction invalidates the catalog after a delete", async () => {
    vi.mocked(deleteProductImage).mockResolvedValue({ ok: true, id: 5 });
    expect(await deleteImageAction(null, form({ imageId: "5" }))).toEqual({ ok: true });
    expect(invalidateCatalog).toHaveBeenCalledOnce();
  });

  it("doesn't invalidate when the save fails", async () => {
    vi.mocked(moveProductImage).mockResolvedValue({ ok: false, message: "Already first." });
    await moveImageAction(null, form({ imageId: "5", direction: "up" }));
    expect(invalidateCatalog).not.toHaveBeenCalled();
  });
});
