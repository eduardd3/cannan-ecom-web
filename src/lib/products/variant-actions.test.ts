import { beforeEach, describe, expect, it, vi } from "vitest";

import { revalidatePath } from "next/cache";
import { invalidateCatalog } from "@/lib/catalog/cache";
import { createVariantAction, setVariantActiveAction, updateVariantAction } from "./variant-actions";
import { createProductVariant, setVariantActive, updateProductVariant } from "./variants";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireStaff: vi.fn(async () => ({ id: 1 })) }));
vi.mock("@/lib/catalog/cache", () => ({ invalidateCatalog: vi.fn() }));
vi.mock("./variants", () => ({ createProductVariant: vi.fn(), updateProductVariant: vi.fn(), setVariantActive: vi.fn() }));

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const valid = { price: "34.00", sku: "SJ-12" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("variant actions", () => {
  it("createVariantAction invalidates the catalog after a save", async () => {
    vi.mocked(createProductVariant).mockResolvedValue({ ok: true, id: 3 });
    expect(await createVariantAction(null, form({ ...valid, productId: "7" }))).toEqual({ ok: true });
    expect(invalidateCatalog).toHaveBeenCalledOnce();
    expect(revalidatePath).not.toHaveBeenCalledWith("/products", "layout");
  });

  it("updateVariantAction invalidates the catalog after a save", async () => {
    vi.mocked(updateProductVariant).mockResolvedValue({ ok: true, id: 3 });
    expect(await updateVariantAction(null, form({ ...valid, variantId: "3" }))).toEqual({ ok: true });
    expect(invalidateCatalog).toHaveBeenCalledOnce();
  });

  it("setVariantActiveAction invalidates the catalog after a change", async () => {
    vi.mocked(setVariantActive).mockResolvedValue({ ok: true, id: 3 });
    expect(await setVariantActiveAction(null, form({ variantId: "3", active: "false" }))).toEqual({ ok: true });
    expect(invalidateCatalog).toHaveBeenCalledOnce();
  });

  it("doesn't invalidate when the save fails", async () => {
    vi.mocked(updateProductVariant).mockResolvedValue({ ok: false, field: "sku", message: "Taken." });
    await updateVariantAction(null, form({ ...valid, variantId: "3" }));
    expect(invalidateCatalog).not.toHaveBeenCalled();
  });
});
