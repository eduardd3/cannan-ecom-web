import { describe, expect, it } from "vitest";

import { shouldMigrate } from "./vercel-build.mjs";

describe("shouldMigrate", () => {
  it("migrates only in production", () => {
    expect(shouldMigrate("production")).toBe(true);
  });

  it.each(["preview", "development", undefined, "", "Production", "prod"])("skips for %j", (env) => {
    expect(shouldMigrate(env)).toBe(false);
  });
});
