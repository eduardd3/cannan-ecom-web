import { beforeEach, describe, expect, it, vi } from "vitest";

import { revalidatePath } from "next/cache";
import { invalidateCatalog } from "@/lib/catalog/cache";
import { adjustStockStandalone } from "@/lib/inventory/adjust";
import { approveOrderAction, fulfillOrderAction, refundOrderAction, restockFromOrderAction } from "./actions";
import { fulfillOrder } from "./fulfillment";
import { approveReviewedOrder, refundReviewedOrder } from "./review";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireStaff: vi.fn(async () => ({ id: 1 })) }));
vi.mock("@/lib/catalog/cache", () => ({ invalidateCatalog: vi.fn() }));
vi.mock("@/lib/inventory/adjust", () => ({ adjustStockStandalone: vi.fn() }));
vi.mock("./review", () => ({ approveReviewedOrder: vi.fn(), refundReviewedOrder: vi.fn() }));
vi.mock("./fulfillment", () => ({ fulfillOrder: vi.fn(), updateTracking: vi.fn() }));
vi.mock("./confirmation", () => ({ sendOrderConfirmation: vi.fn() }));
vi.mock("./shipped-email", () => ({ sendShippedEmail: vi.fn() }));

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("order actions", () => {
  it("approveOrderAction invalidates the catalog when the approval moves stock", async () => {
    vi.mocked(approveReviewedOrder).mockResolvedValue({ ok: true });
    await approveOrderAction(null, form({ orderId: "9" }));
    expect(invalidateCatalog).toHaveBeenCalledOnce();
    expect(revalidatePath).not.toHaveBeenCalledWith("/products", "layout");
  });

  it("refundOrderAction invalidates the catalog when the refund moves stock", async () => {
    vi.mocked(refundReviewedOrder).mockResolvedValue({ ok: true });
    await refundOrderAction(null, form({ orderId: "9" }));
    expect(invalidateCatalog).toHaveBeenCalledOnce();
  });

  it("doesn't invalidate when the approval fails", async () => {
    vi.mocked(approveReviewedOrder).mockResolvedValue({ ok: false, error: "NOT_IN_REVIEW", message: "Not in review." });
    await approveOrderAction(null, form({ orderId: "9" }));
    expect(invalidateCatalog).not.toHaveBeenCalled();
  });

  it("restockFromOrderAction invalidates the catalog after a restock", async () => {
    vi.mocked(adjustStockStandalone).mockResolvedValue({ ok: true, adjustmentId: 1, stockAfter: 2 });
    expect(await restockFromOrderAction(null, form({ orderId: "9", variantId: "3", quantity: "2" }))).toEqual({
      ok: true,
    });
    expect(invalidateCatalog).toHaveBeenCalledOnce();
  });

  it("doesn't invalidate for a shipment, which moves no stock", async () => {
    vi.mocked(fulfillOrder).mockResolvedValue({ ok: true });
    await fulfillOrderAction(null, form({ orderId: "9", carrier: "USPS", trackingNumber: "9400100000000000000000" }));
    expect(revalidatePath).toHaveBeenCalledWith("/adm/orders", "layout");
    expect(invalidateCatalog).not.toHaveBeenCalled();
  });
});
