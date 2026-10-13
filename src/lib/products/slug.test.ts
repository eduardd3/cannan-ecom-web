import { describe, expect, it } from "vitest";

import { MAX_SLUG_LENGTH, slugify, slugProblem } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("San Judas Tadeo Candle")).toBe("san-judas-tadeo-candle");
  });

  it("removes Spanish accents and ñ", () => {
    expect(slugify("Nuestra Señora de Guadalupe")).toBe("nuestra-senora-de-guadalupe");
    expect(slugify("Oración a San Martín")).toBe("oracion-a-san-martin");
  });

  it("collapses punctuation and trims hyphens", () => {
    expect(slugify("  Rosary -- 8mm (Blue)!  ")).toBe("rosary-8mm-blue");
    expect(slugify("Saints & Angels")).toBe("saints-and-angels");
  });

  it("returns an empty string when nothing usable is left", () => {
    expect(slugify("✝️ ★")).toBe("");
  });

  it("caps the length at a word boundary", () => {
    const slug = slugify("word ".repeat(40));
    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug.endsWith("word")).toBe(true);
  });

  it("always produces a slug slugProblem accepts, when non-empty", () => {
    for (const name of ["Ofrenda Yemayá 7 Potencias", "A", "x".repeat(200), "—Día de los Muertos—"]) {
      const slug = slugify(name);
      expect(slugProblem(slug)).toBeNull();
    }
  });
});

describe("slugProblem", () => {
  it("accepts lowercase words joined by single hyphens", () => {
    expect(slugProblem("st-jude-candle-2")).toBeNull();
  });

  it("refuses blanks, uppercase, spaces, doubled or edge hyphens, and overlong slugs", () => {
    expect(slugProblem("")).toMatch(/Enter/);
    expect(slugProblem("St-Jude")).not.toBeNull();
    expect(slugProblem("st jude")).not.toBeNull();
    expect(slugProblem("st--jude")).not.toBeNull();
    expect(slugProblem("-st-jude")).not.toBeNull();
    expect(slugProblem("st-jude-")).not.toBeNull();
    expect(slugProblem("a".repeat(MAX_SLUG_LENGTH + 1))).toMatch(/80/);
  });
});
