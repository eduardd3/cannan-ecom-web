import { describe, expect, it } from "vitest";

import { DEFAULT_SIGNED_IN_PATH, safeCallbackPath, signedInPath } from "./callback-url";

const ORIGIN = "https://www.shopcannan.com";

describe("safeCallbackPath", () => {
  it("keeps a relative path, with its query and hash", () => {
    expect(safeCallbackPath("/id/checkout", ORIGIN)).toBe("/id/checkout");
    expect(safeCallbackPath("/products/vela?variant=12#details", ORIGIN)).toBe("/products/vela?variant=12#details");
  });

  it("rejects protocol-relative paths", () => {
    expect(safeCallbackPath("//evil.com", ORIGIN)).toBeNull();
    expect(safeCallbackPath("/\\evil.com", ORIGIN)).toBeNull();
  });

  it("rejects a path the URL parser turns into another host", () => {
    expect(safeCallbackPath("/\t/evil.com", ORIGIN)).toBeNull();
  });

  it("converts a same-origin absolute URL to its path", () => {
    expect(safeCallbackPath(`${ORIGIN}/id/checkout`, ORIGIN)).toBe("/id/checkout");
    expect(safeCallbackPath(`${ORIGIN}/cart?x=1#top`, ORIGIN)).toBe("/cart?x=1#top");
  });

  it("rejects another origin, including the apex and http", () => {
    expect(safeCallbackPath("https://evil.com/id/checkout", ORIGIN)).toBeNull();
    expect(safeCallbackPath("https://shopcannan.com/id/checkout", ORIGIN)).toBeNull();
    expect(safeCallbackPath("http://www.shopcannan.com/id/checkout", ORIGIN)).toBeNull();
  });

  it("rejects javascript: and other non-http schemes", () => {
    expect(safeCallbackPath("javascript:alert(1)", ORIGIN)).toBeNull();
    expect(safeCallbackPath("data:text/html,hi", ORIGIN)).toBeNull();
  });

  it("rejects empty, missing, and bare values", () => {
    expect(safeCallbackPath("", ORIGIN)).toBeNull();
    expect(safeCallbackPath(null, ORIGIN)).toBeNull();
    expect(safeCallbackPath(undefined, ORIGIN)).toBeNull();
    expect(safeCallbackPath("id/checkout", ORIGIN)).toBeNull();
  });
});

describe("signedInPath", () => {
  it("goes to a safe callbackUrl, as a relative path", () => {
    expect(signedInPath("/id/checkout", ORIGIN)).toBe("/id/checkout");
    expect(signedInPath(`${ORIGIN}/id/checkout`, ORIGIN)).toBe("/id/checkout");
  });

  it("falls back to the dashboard when there's none or it isn't safe", () => {
    expect(signedInPath(null, ORIGIN)).toBe(DEFAULT_SIGNED_IN_PATH);
    expect(signedInPath("", ORIGIN)).toBe(DEFAULT_SIGNED_IN_PATH);
    expect(signedInPath("//evil.com", ORIGIN)).toBe(DEFAULT_SIGNED_IN_PATH);
    expect(signedInPath("https://evil.com/id/checkout", ORIGIN)).toBe(DEFAULT_SIGNED_IN_PATH);
  });
});
