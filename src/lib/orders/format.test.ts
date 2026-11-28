import { describe, expect, it } from "vitest";

import { formatOrderDay, parseOrderId, shippingName } from "./format";

describe("formatOrderDay", () => {
  it("shows the shop's date with no leading zero or time", () => {
    expect(formatOrderDay(new Date("2026-10-02T19:00:00Z"))).toBe("Oct 2, 2026");
  });

  it("uses the shop's time zone, not UTC", () => {
    // 2026-10-03 03:00 UTC is still Oct 2 in Los Angeles.
    expect(formatOrderDay(new Date("2026-10-03T03:00:00Z"))).toBe("Oct 2, 2026");
  });
});

describe("parseOrderId", () => {
  it("accepts a positive Int4", () => {
    expect(parseOrderId("42")).toBe(42);
    expect(parseOrderId("2147483647")).toBe(2_147_483_647);
  });

  it("rejects ids that can't be an order", () => {
    for (const raw of ["0", "-1", "1.5", "abc", "", "2147483648", "99999999999999999999"]) {
      expect(parseOrderId(raw)).toBeNull();
    }
  });
});

describe("shippingName", () => {
  it("reads the recipient's name from the stored address", () => {
    expect(shippingName({ name: "Ana Buyer", line1: "1 Main St" })).toBe("Ana Buyer");
    expect(shippingName({ name: "  Ana Buyer " })).toBe("Ana Buyer");
  });

  it("returns null when there's no usable name", () => {
    for (const value of [null, undefined, "Ana", [], {}, { name: null }, { name: "   " }, { name: 42 }]) {
      expect(shippingName(value)).toBeNull();
    }
  });
});
