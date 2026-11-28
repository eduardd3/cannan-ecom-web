import { describe, expect, it } from "vitest";

import { resolveAppOrigin } from "./app-origin";

describe("resolveAppOrigin", () => {
  it("uses localhost under next dev", () => {
    expect(resolveAppOrigin({ NODE_ENV: "development", VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "x.vercel.app" })).toBe(
      "http://localhost:3000",
    );
  });

  it("uses the branch URL on a Preview", () => {
    expect(
      resolveAppOrigin({ NODE_ENV: "production", VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "shop-git-guest.vercel.app" }),
    ).toBe("https://shop-git-guest.vercel.app");
  });

  it("falls back to www on a Preview without a branch URL", () => {
    expect(resolveAppOrigin({ NODE_ENV: "production", VERCEL_ENV: "preview" })).toBe("https://www.shopcannan.com");
  });

  it("uses www in production, even if a branch URL is set", () => {
    expect(
      resolveAppOrigin({ NODE_ENV: "production", VERCEL_ENV: "production", VERCEL_BRANCH_URL: "shop-git-main.vercel.app" }),
    ).toBe("https://www.shopcannan.com");
  });

  it("uses www when nothing is set (a local production build)", () => {
    expect(resolveAppOrigin({})).toBe("https://www.shopcannan.com");
  });
});
