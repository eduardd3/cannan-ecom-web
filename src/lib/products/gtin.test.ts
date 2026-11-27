import { describe, expect, it } from "vitest";

import { isRestrictedGtin, isValidGtin } from "./gtin";

// Check digits computed with the GS1 mod-10 rule, not invented. The first
// four, and the ISBN, are published examples.
describe("isValidGtin", () => {
  it("accepts GTIN-8, UPC-12, EAN-13, and GTIN-14 with a correct check digit", () => {
    for (const good of ["96385074", "036000291452", "4006381333931", "10012345678902"]) {
      expect(isValidGtin(good), good).toBe(true);
    }
  });

  it("refuses a wrong check digit", () => {
    expect(isValidGtin("036000291453")).toBe(false);
    expect(isValidGtin("4006381333932")).toBe(false);
  });

  it("refuses lengths other than 8, 12, 13, or 14, and anything but digits", () => {
    for (const bad of ["", "1234567", "123456789", "03600029145", "123456789012345", "03600029145X", " 036000291452"]) {
      expect(isValidGtin(bad), JSON.stringify(bad)).toBe(false);
    }
  });
});

describe("isRestrictedGtin", () => {
  it("allows ordinary UPC, EAN, ISBN, and packaging-level GTIN-14 numbers", () => {
    // 978… is an ISBN (the Bibles): it starts with 97, not the 98 coupon range.
    for (const allowed of ["036000291452", "4006381333931", "9781941243954", "10012345678902"]) {
      expect(isRestrictedGtin(allowed), allowed).toBe(false);
    }
  });

  it("refuses each restricted and coupon prefix on the 13-digit form", () => {
    const cases = {
      "2 (EAN-13)": "2012345678903",
      "02 (a UPC-12 starting with 2)": "212345678909",
      "04 (a UPC-12 starting with 4)": "412345678903",
      "05 (a UPC-12 starting with 5)": "512345678900",
      "98 (EAN-13)": "9812345678902",
      "99 (EAN-13)": "9912345678909",
    };
    for (const [prefix, digits] of Object.entries(cases)) {
      expect(isRestrictedGtin(digits), prefix).toBe(true);
    }
  });

  it("pads a UPC-12 to 13 digits before checking prefixes", () => {
    // Raw, these start with 98, 99, and 02; padded they're 098…, 099…, 002…,
    // ordinary products. Without the pad they'd be refused.
    for (const upc of ["981234567890", "991234567899", "021234567893"]) {
      expect(isRestrictedGtin(upc), upc).toBe(false);
    }
  });

  it("refuses a GTIN-14 for bulk sale (first digit 9)", () => {
    expect(isRestrictedGtin("90012345678908")).toBe(true);
  });

  it("checks a packaging-level GTIN-14 by the number after its indicator", () => {
    // Indicator 1, then 04…: the base number is in a restricted range.
    expect(isRestrictedGtin("10412345678900")).toBe(true);
  });

  it("skips the prefix check for GTIN-8", () => {
    expect(isRestrictedGtin("21234569")).toBe(false);
  });
});
