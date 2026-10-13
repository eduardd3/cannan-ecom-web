import { describe, expect, it } from "vitest";

import {
  formatPriceInput,
  MAX_SKU_LENGTH,
  normalizeSku,
  parseAsin,
  parseOption,
  parsePriceCents,
  parseWholeNumber,
} from "./variant-fields";

describe("parsePriceCents", () => {
  it("reads dollars with up to two decimals", () => {
    expect(parsePriceCents("24.99")).toBe(2499);
    expect(parsePriceCents("24.9")).toBe(2490);
    expect(parsePriceCents("24")).toBe(2400);
    expect(parsePriceCents(" $1,024.50 ")).toBe(102450);
    expect(parsePriceCents("0.50")).toBe(50);
  });

  it("refuses zero, negatives, extra decimals, junk, and absurd prices", () => {
    for (const bad of ["0", "0.00", "-5", "24.999", "abc", "", "24.", ".99", "100000"]) {
      expect(parsePriceCents(bad), bad).toBeNull();
    }
  });

  it("round-trips through the form's text", () => {
    expect(parsePriceCents(formatPriceInput(2490))).toBe(2490);
    expect(formatPriceInput(2400)).toBe("24.00");
  });
});

describe("normalizeSku", () => {
  it("trims and uppercases", () => {
    expect(normalizeSku("  cnn-sj-7day ")).toBe("CNN-SJ-7DAY");
    expect(normalizeSku("a_b.c")).toBe("A_B.C");
  });

  it("refuses blanks, spaces, leading punctuation, and overlong SKUs", () => {
    expect(normalizeSku("")).toBeNull();
    expect(normalizeSku("CNN SJ")).toBeNull();
    expect(normalizeSku("-CNN")).toBeNull();
    expect(normalizeSku("A".repeat(MAX_SKU_LENGTH + 1))).toBeNull();
  });
});

describe("parseAsin", () => {
  it("treats blank as none and uppercases ten characters", () => {
    expect(parseAsin("  ")).toEqual({ ok: true, value: null });
    expect(parseAsin("b0abc12345")).toEqual({ ok: true, value: "B0ABC12345" });
  });

  it("refuses any other length or punctuation", () => {
    expect(parseAsin("B0ABC1234").ok).toBe(false);
    expect(parseAsin("B0ABC-2345").ok).toBe(false);
  });
});

describe("parseOption", () => {
  it("treats both blank as the default variant", () => {
    expect(parseOption(" ", "")).toEqual({ ok: true, value: null });
  });

  it("trims and collapses spaces", () => {
    expect(parseOption(" Size ", " Extra   Large ")).toEqual({ ok: true, value: { name: "Size", value: "Extra Large" } });
  });

  it("refuses one without the other", () => {
    expect(parseOption("Size", "")).toMatchObject({ ok: false, message: /both/ });
    expect(parseOption("", "Large")).toMatchObject({ ok: false, message: /both/ });
  });
});

describe("parseWholeNumber", () => {
  it("returns the blank value for blank input", () => {
    expect(parseWholeNumber("", 10, 0)).toEqual({ ok: true, value: 0 });
    expect(parseWholeNumber(" ", 10, null)).toEqual({ ok: true, value: null });
  });

  it("accepts 0 to max and refuses the rest", () => {
    expect(parseWholeNumber("10", 10, 0)).toEqual({ ok: true, value: 10 });
    expect(parseWholeNumber("11", 10, 0).ok).toBe(false);
    expect(parseWholeNumber("-1", 10, 0).ok).toBe(false);
    expect(parseWholeNumber("1.5", 10, 0).ok).toBe(false);
  });
});
