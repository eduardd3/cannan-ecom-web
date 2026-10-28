import { describe, expect, it } from "vitest";

import { BLOCKED_US_STATES, SHIP_TO_COUNTRIES, blockedDestination } from "./countries";

describe("SHIP_TO_COUNTRIES", () => {
  it("is the US and Puerto Rico, as the Shipping policy says", () => {
    expect(SHIP_TO_COUNTRIES).toEqual(["US", "PR"]);
  });
});

describe("blockedDestination", () => {
  it("blocks the other territories and the freely associated states", () => {
    expect(Object.keys(BLOCKED_US_STATES).sort()).toEqual(["AS", "FM", "GU", "MH", "MP", "PW", "VI"]);
    for (const state of Object.keys(BLOCKED_US_STATES)) {
      expect(blockedDestination({ country: "US", state })?.code).toBe(state);
    }
    expect(blockedDestination({ country: "US", state: "GU" })).toEqual({ code: "GU", name: "Guam" });
  });

  it("allows Puerto Rico, as a country or as a US state", () => {
    expect(blockedDestination({ country: "PR", state: null })).toBeNull();
    expect(blockedDestination({ country: "US", state: "PR" })).toBeNull();
  });

  it("allows APO/FPO and the states", () => {
    for (const state of ["AA", "AE", "AP", "CA", "AK", "HI", "DC"]) {
      expect(blockedDestination({ country: "US", state })).toBeNull();
    }
  });

  it("normalizes case and whitespace", () => {
    expect(blockedDestination({ country: " us ", state: " gu " })?.code).toBe("GU");
  });

  it("allows a missing state, and ignores prototype keys", () => {
    expect(blockedDestination({ country: "US" })).toBeNull();
    expect(blockedDestination({ country: "US", state: "" })).toBeNull();
    expect(blockedDestination({ country: "US", state: "toString" })).toBeNull();
  });
});
