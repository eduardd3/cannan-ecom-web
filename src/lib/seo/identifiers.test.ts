import { describe, expect, it } from "vitest";

import { productIdentifiers } from "./identifiers";

const BRAND = { brand: "Mg Collection" };
const UNBRANDED = { brand: null };
const UPC = "036000291452";

// Each test checks the whole result, so a field can't be right while
// identifierExists disagrees with it.
describe("productIdentifiers", () => {
  it("sends the gtin when it's verified", () => {
    expect(productIdentifiers(BRAND, { gtin: UPC, gtinVerified: true, mpn: null })).toEqual({
      brand: "Mg Collection",
      gtin: UPC,
      mpn: null,
      identifierExists: true,
    });
  });

  it("sends the mpn, not the gtin, when the gtin is unverified and there's an mpn", () => {
    expect(productIdentifiers(BRAND, { gtin: UPC, gtinVerified: false, mpn: "MG-1042" })).toEqual({
      brand: "Mg Collection",
      gtin: null,
      mpn: "MG-1042",
      identifierExists: true,
    });
  });

  it("sends neither when the gtin is unverified and there's no mpn, with identifierExists false", () => {
    // The stored gtin is set but not sent, so it mustn't count as an identifier.
    expect(productIdentifiers(BRAND, { gtin: UPC, gtinVerified: false, mpn: null })).toEqual({
      brand: "Mg Collection",
      gtin: null,
      mpn: null,
      identifierExists: false,
    });
  });

  it("sends no brand for an unbranded print", () => {
    expect(productIdentifiers(UNBRANDED, { gtin: null, gtinVerified: false, mpn: null })).toEqual({
      brand: null,
      gtin: null,
      mpn: null,
      identifierExists: false,
    });
  });

  it("sends the brand with identifierExists false when there's no gtin and no mpn", () => {
    expect(productIdentifiers(BRAND, { gtin: null, gtinVerified: false, mpn: null })).toEqual({
      brand: "Mg Collection",
      gtin: null,
      mpn: null,
      identifierExists: false,
    });
  });

  it("sends both a verified gtin and the mpn when there are both", () => {
    expect(productIdentifiers(BRAND, { gtin: UPC, gtinVerified: true, mpn: "MG-1042" })).toEqual({
      brand: "Mg Collection",
      gtin: UPC,
      mpn: "MG-1042",
      identifierExists: true,
    });
  });
});
