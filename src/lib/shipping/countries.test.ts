import { describe, expect, it } from "vitest";

import { SHIP_TO_COUNTRIES } from "./countries";

describe("SHIP_TO_COUNTRIES", () => {
  it("is the US and Puerto Rico, as the Shipping policy says", () => {
    expect(SHIP_TO_COUNTRIES).toEqual(["US", "PR"]);
  });
});
