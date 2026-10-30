import { describe, expect, it } from "vitest";

import {
  formatPriceInput,
  MAX_OPTION_LENGTH,
  MAX_SKU_LENGTH,
  normalizeSku,
  parseAsin,
  parseDimensions,
  parseGtin,
  parseOptionPair,
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

describe("parseOptionPair", () => {
  it("treats blanks as none", () => {
    expect(parseOptionPair(" ", "")).toEqual({ ok: true, value: [null, null] });
    expect(parseOptionPair("Color", " ")).toEqual({ ok: true, value: ["Color", null] });
  });

  it("trims and collapses spaces", () => {
    expect(parseOptionPair(" Siete   colores ", " 12 in ")).toEqual({ ok: true, value: ["Siete colores", "12 in"] });
  });

  it("refuses option 2 without option 1", () => {
    expect(parseOptionPair("", "12 in")).toMatchObject({ ok: false, message: /option 1/ });
  });

  it("refuses overlong options", () => {
    expect(parseOptionPair("x".repeat(MAX_OPTION_LENGTH + 1), "")).toMatchObject({ ok: false });
  });
});

describe("parseGtin", () => {
  it("treats blank as none", () => {
    expect(parseGtin(" ")).toEqual({ ok: true, value: null });
  });

  it("accepts GTIN-8, UPC, EAN, and GTIN-14 with a valid check digit", () => {
    expect(parseGtin("96385074")).toEqual({ ok: true, value: "96385074" });
    expect(parseGtin("012345678905")).toEqual({ ok: true, value: "012345678905" });
    expect(parseGtin("4006381333931")).toEqual({ ok: true, value: "4006381333931" });
    expect(parseGtin("10012345678902")).toEqual({ ok: true, value: "10012345678902" });
  });

  it("ignores spaces and hyphens", () => {
    expect(parseGtin(" 0 12345-67890 5 ")).toEqual({ ok: true, value: "012345678905" });
  });

  it("refuses a wrong check digit, wrong length, or letters", () => {
    for (const bad of ["012345678906", "1234567", "123456789", "01234567890X", "123456789012345"]) {
      expect(parseGtin(bad).ok, bad).toBe(false);
    }
  });
});

describe("parseDimensions", () => {
  it("treats all blank as none", () => {
    expect(parseDimensions("", " ", "")).toEqual({ ok: true, value: null });
  });

  it("normalizes inches", () => {
    expect(parseDimensions("8.00", " 3.5 ", "0.25")).toEqual({
      ok: true,
      value: { heightIn: "8", widthIn: "3.5", depthIn: "0.25" },
    });
  });

  it("refuses some but not all", () => {
    expect(parseDimensions("8", "", "3")).toMatchObject({ ok: false, message: /all three/ });
  });

  it("refuses zero, negatives, extra decimals, junk, and absurd sizes", () => {
    for (const bad of ["0", "-1", "3.555", "abc", "10000", "3."]) {
      expect(parseDimensions(bad, "1", "1").ok, bad).toBe(false);
    }
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
