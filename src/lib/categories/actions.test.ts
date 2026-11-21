import { beforeEach, describe, expect, it, vi } from "vitest";

import { revalidatePath } from "next/cache";
import { invalidateCatalog } from "@/lib/catalog/cache";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "./actions";
import { createCategory, deleteCategory, updateCategory } from "./save";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireStaff: vi.fn(async () => ({ id: 1 })) }));
vi.mock("@/lib/catalog/cache", () => ({ invalidateCatalog: vi.fn() }));
vi.mock("./save", () => ({ createCategory: vi.fn(), updateCategory: vi.fn(), deleteCategory: vi.fn() }));

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const valid = { name: "San José", slug: "san-jose", description: "", collectionId: "1" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("category actions", () => {
  it("createCategoryAction invalidates the catalog after a save", async () => {
    vi.mocked(createCategory).mockResolvedValue({ ok: true, id: 4 });
    expect(await createCategoryAction(null, form(valid))).toMatchObject({ ok: true });
    expect(invalidateCatalog).toHaveBeenCalledOnce();
    expect(revalidatePath).not.toHaveBeenCalledWith("/products", "layout");
  });

  it("updateCategoryAction invalidates the catalog after a save", async () => {
    vi.mocked(updateCategory).mockResolvedValue({ ok: true, id: 4 });
    expect(await updateCategoryAction(null, form({ ...valid, categoryId: "4" }))).toMatchObject({ ok: true });
    expect(invalidateCatalog).toHaveBeenCalledOnce();
  });

  it("deleteCategoryAction invalidates the catalog after a delete", async () => {
    vi.mocked(deleteCategory).mockResolvedValue({ ok: true });
    await deleteCategoryAction(null, form({ categoryId: "4" }));
    expect(invalidateCatalog).toHaveBeenCalledOnce();
  });

  it("doesn't invalidate when the delete fails", async () => {
    vi.mocked(deleteCategory).mockResolvedValue({ ok: false, message: "Still in use." });
    await deleteCategoryAction(null, form({ categoryId: "4" }));
    expect(invalidateCatalog).not.toHaveBeenCalled();
  });
});
