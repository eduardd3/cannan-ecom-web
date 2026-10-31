import { describe, expect, it } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { dimensionLayout, formatDimensions, formatVariantLabel } from "./format";

describe("formatVariantLabel", () => {
  it("is null for a default variant", () => {
    expect(formatVariantLabel({ option1Value: null, option2Value: null })).toBeNull();
  });

  it("shows one value on its own", () => {
    expect(formatVariantLabel({ option1Value: "12 in", option2Value: null })).toBe("12 in");
  });

  it("joins two values, option 1 first", () => {
    expect(formatVariantLabel({ option1Value: "Roja", option2Value: "12 in" })).toBe("Roja · 12 in");
  });
});

describe("formatDimensions", () => {
  it("drops trailing zeros", () => {
    expect(formatDimensions({ heightIn: "8.00", widthIn: "3.50", depthIn: "3.00" }, "statues")).toBe("8 × 3.5 × 3 in");
  });

  it("accepts Prisma decimals and numbers", () => {
    expect(
      formatDimensions(
        { heightIn: new Prisma.Decimal("12.00"), widthIn: 5, depthIn: new Prisma.Decimal("4.25") },
        "statues",
      ),
    ).toBe("12 × 5 × 4.25 in");
  });

  it("puts length (the width column) first for framed prints", () => {
    expect(formatDimensions({ heightIn: "12", widthIn: "16", depthIn: "1.5" }, "framed-prints")).toBe(
      "16 × 12 × 1.5 in",
    );
  });

  it("is null unless all three are set", () => {
    expect(formatDimensions({ heightIn: null, widthIn: null, depthIn: null }, "statues")).toBeNull();
    expect(formatDimensions({ heightIn: "8", widthIn: null, depthIn: "3" }, "statues")).toBeNull();
    expect(formatDimensions({ heightIn: "8", widthIn: null, depthIn: "3" }, "framed-prints")).toBeNull();
  });
});

describe("dimensionLayout", () => {
  it("reads L × H × D for framed prints", () => {
    const layout = dimensionLayout("framed-prints");
    expect(layout.abbreviation).toBe("L × H × D");
    expect(layout.axes.map(({ key, label }) => `${label}:${key}`)).toEqual([
      "Length:widthIn",
      "Height:heightIn",
      "Depth:depthIn",
    ]);
  });

  it("reads H × W × D for every other type", () => {
    for (const slug of ["statues", "candles", "bibles"]) {
      expect(dimensionLayout(slug).abbreviation).toBe("H × W × D");
    }
  });
});
