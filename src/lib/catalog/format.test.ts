import { describe, expect, it } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { formatDimensions, formatVariantLabel } from "./format";

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
    expect(formatDimensions({ heightIn: "8.00", widthIn: "3.50", depthIn: "3.00" })).toBe("8 × 3.5 × 3 in");
  });

  it("accepts Prisma decimals and numbers", () => {
    expect(
      formatDimensions({ heightIn: new Prisma.Decimal("12.00"), widthIn: 5, depthIn: new Prisma.Decimal("4.25") }),
    ).toBe("12 × 5 × 4.25 in");
  });

  it("is null unless all three are set", () => {
    expect(formatDimensions({ heightIn: null, widthIn: null, depthIn: null })).toBeNull();
    expect(formatDimensions({ heightIn: "8", widthIn: null, depthIn: "3" })).toBeNull();
  });
});
