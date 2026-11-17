import { beforeEach, describe, expect, it, vi } from "vitest";

import { revalidatePath } from "next/cache";
import { invalidateCatalog } from "@/lib/catalog/cache";
import { createProductAction, updateProductAction } from "./actions";
import { createProduct, updateProduct } from "./save";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireStaff: vi.fn(async () => ({ id: 1 })) }));
vi.mock("@/lib/catalog/cache", () => ({ invalidateCatalog: vi.fn() }));
vi.mock("./save", () => ({ createProduct: vi.fn(), updateProduct: vi.fn() }));

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const valid = {
  name: "San José Statue",
  slug: "san-jose-statue",
  description: "A statue.",
  collectionId: "1",
  productTypeId: "1",
  categoryId: "",
  status: "ACTIVE",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("product actions", () => {
  it("createProductAction invalidates the catalog after a save", async () => {
    vi.mocked(createProduct).mockResolvedValue({ ok: true, id: 7 });
    await createProductAction(null, form(valid));
    expect(invalidateCatalog).toHaveBeenCalledOnce();
    expect(revalidatePath).not.toHaveBeenCalledWith("/products", "layout");
  });

  it("updateProductAction invalidates the catalog after a save", async () => {
    vi.mocked(updateProduct).mockResolvedValue({ ok: true, id: 7 });
    await updateProductAction(null, form({ ...valid, productId: "7" }));
    expect(invalidateCatalog).toHaveBeenCalledOnce();
  });

  it("doesn't invalidate when the save fails", async () => {
    vi.mocked(updateProduct).mockResolvedValue({ ok: false, field: "slug", message: "Taken." });
    await updateProductAction(null, form({ ...valid, productId: "7" }));
    expect(invalidateCatalog).not.toHaveBeenCalled();
  });
});
