import { describe, it } from "vitest";

// L1–L3 (Lalo). The rules are in each function's doc comment in sorting.ts.

describe("parseSort", () => {
  it.todo("valid: newest, price-asc and price-desc each return that key");
  it.todo("featured returns featured");
  it.todo("missing returns featured");
  it.todo("unknown value returns featured");
  it.todo("array: uses a valid first value");
  it.todo("array whose first value isn't valid returns featured");
});

describe("parsePage", () => {
  it.todo("valid");
  it.todo("zero");
  it.todo("negative");
  it.todo("decimal");
  it.todo("non-numeric");
  it.todo("empty");
  it.todo("array");
});

describe("compareCards", () => {
  it.todo("sold out last under each sort");
  it.todo("featured first");
  it.todo("equal prices fall back to rank");
  // Through buildListing, so the card is priced from the matching variants.
  it.todo("price uses the matching-variant price (a Roja filter sorts by the red variants' price)");
});
