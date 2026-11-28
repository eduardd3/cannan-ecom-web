import { describe, expect, it } from "vitest";

import { generateToken } from "@/lib/tokens";
import { isWellFormedOrderAccessToken } from "./access-token";

describe("isWellFormedOrderAccessToken", () => {
  it("accepts what generateToken produces", () => {
    for (let i = 0; i < 20; i += 1) expect(isWellFormedOrderAccessToken(generateToken())).toBe(true);
  });

  it("rejects anything that isn't 43 base64url characters", () => {
    const good = "a".repeat(43);
    for (const value of [null, undefined, "", "a".repeat(42), "a".repeat(44), `${good.slice(1)}=`, `${good.slice(1)}+`, `${good.slice(1)}/`, ` ${good.slice(1)}`]) {
      expect(isWellFormedOrderAccessToken(value)).toBe(false);
    }
    expect(isWellFormedOrderAccessToken(good)).toBe(true);
  });
});
