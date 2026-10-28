import { describe, expect, it } from "vitest";

import { generateGuestToken, hashGuestToken, isWellFormedGuestToken } from "./guest-token";

describe("isWellFormedGuestToken", () => {
  it("accepts a generated token", () => {
    const token = generateGuestToken();
    expect(token).toHaveLength(43);
    expect(isWellFormedGuestToken(token)).toBe(true);
  });

  it("rejects a token that's too short or too long", () => {
    const token = generateGuestToken();
    expect(isWellFormedGuestToken(token.slice(1))).toBe(false);
    expect(isWellFormedGuestToken(`${token}A`)).toBe(false);
  });

  it("rejects characters outside base64url", () => {
    expect(isWellFormedGuestToken(`${"A".repeat(42)}+`)).toBe(false);
    expect(isWellFormedGuestToken(`${"A".repeat(42)}=`)).toBe(false);
    expect(isWellFormedGuestToken(`${"A".repeat(42)} `)).toBe(false);
  });

  it("rejects missing values", () => {
    expect(isWellFormedGuestToken(undefined)).toBe(false);
    expect(isWellFormedGuestToken(null)).toBe(false);
    expect(isWellFormedGuestToken("")).toBe(false);
  });
});

describe("hashGuestToken", () => {
  it("is stable, hex SHA-256, and never the token itself", () => {
    const token = generateGuestToken();
    const hash = hashGuestToken(token);
    expect(hashGuestToken(token)).toBe(hash);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe(token);
    expect(hashGuestToken(generateGuestToken())).not.toBe(hash);
  });
});
