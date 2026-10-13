import { describe, expect, it } from "vitest";

import { MAX_UPLOAD_BYTES } from "@/lib/storage/limits";
import { fileProblem, MAX_ALT_LENGTH, normalizeAlt } from "./image-fields";

describe("fileProblem", () => {
  it("accepts JPEG, PNG, and WebP up to the size cap", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(fileProblem({ type, size: MAX_UPLOAD_BYTES })).toBeNull();
    }
  });

  it("refuses other types, empty files, and oversized files", () => {
    expect(fileProblem({ type: "image/svg+xml", size: 10 })).toMatch(/JPEG/);
    expect(fileProblem({ type: "image/gif", size: 10 })).toMatch(/JPEG/);
    expect(fileProblem({ type: "image/png", size: 0 })).toMatch(/empty/);
    expect(fileProblem({ type: "image/png", size: MAX_UPLOAD_BYTES + 1 })).toMatch(/10 MB/);
  });
});

describe("normalizeAlt", () => {
  it("trims and collapses spaces", () => {
    expect(normalizeAlt("  Seven-day   candle,  front ")).toBe("Seven-day candle, front");
  });

  it("refuses blank and overlong text", () => {
    expect(normalizeAlt("   ")).toBeNull();
    expect(normalizeAlt("a".repeat(MAX_ALT_LENGTH + 1))).toBeNull();
  });
});
