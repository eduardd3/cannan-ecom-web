import { describe, expect, it } from "vitest";

import { parseOrderId } from "./format";

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
