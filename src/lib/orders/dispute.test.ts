import { describe, expect, it } from "vitest";

import { formatDisputeReason, formatDisputeStatus, isDisputeOpen } from "./dispute";

describe("isDisputeOpen", () => {
  it("is false with no dispute and for every closed status", () => {
    for (const status of [null, undefined, "won", "lost", "warning_closed", "prevented"]) {
      expect(isDisputeOpen(status)).toBe(false);
    }
  });

  it("is true for open disputes, inquiries, and statuses Stripe adds later", () => {
    for (const status of ["needs_response", "under_review", "warning_needs_response", "warning_under_review", "brand_new"]) {
      expect(isDisputeOpen(status)).toBe(true);
    }
  });
});

describe("formatDisputeStatus / formatDisputeReason", () => {
  it("labels known statuses and falls back to a readable form", () => {
    expect(formatDisputeStatus("needs_response")).toBe("Needs response");
    expect(formatDisputeStatus("brand_new")).toBe("Brand new");
    expect(formatDisputeReason("product_not_received")).toBe("Product not received");
  });
});
