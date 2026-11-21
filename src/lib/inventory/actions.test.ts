import { beforeEach, describe, expect, it, vi } from "vitest";

import { revalidatePath } from "next/cache";
import { invalidateCatalog } from "@/lib/catalog/cache";
import { recordAdjustmentAction } from "./actions";
import { recordManualAdjustment } from "./manual-adjust";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireStaff: vi.fn(async () => ({ id: 1 })) }));
vi.mock("@/lib/catalog/cache", () => ({ invalidateCatalog: vi.fn() }));
vi.mock("./manual-adjust", () => ({ recordManualAdjustment: vi.fn() }));

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const restock = { variantId: "3", reason: "RESTOCK", amount: "5", note: "" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("recordAdjustmentAction", () => {
  it("invalidates the catalog after a stock change", async () => {
    vi.mocked(recordManualAdjustment).mockResolvedValue({ ok: true, stockAfter: 5 });
    expect(await recordAdjustmentAction(null, form(restock))).toMatchObject({ ok: true });
    expect(invalidateCatalog).toHaveBeenCalledOnce();
    expect(revalidatePath).not.toHaveBeenCalledWith("/products", "layout");
  });

  it("doesn't invalidate when the adjustment fails", async () => {
    vi.mocked(recordManualAdjustment).mockResolvedValue({ ok: false, message: "Not enough stock." });
    await recordAdjustmentAction(null, form(restock));
    expect(invalidateCatalog).not.toHaveBeenCalled();
  });
});
