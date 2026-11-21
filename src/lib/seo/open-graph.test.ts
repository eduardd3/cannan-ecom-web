import { describe, expect, it } from "vitest";

import { buildOpenGraph } from "./open-graph";

describe("buildOpenGraph", () => {
  it("accepts a plain path", () => {
    expect(buildOpenGraph({ title: "Signature", path: "/collections/signature" })).toMatchObject({
      url: "/collections/signature",
    });
  });

  it("accepts ?page=, the plain list's canonical on later pages", () => {
    expect(buildOpenGraph({ title: "Signature", path: "/collections/signature?page=2" })).toMatchObject({
      url: "/collections/signature?page=2",
    });
  });

  it("rejects filter, sort and variant parameters, alone or next to ?page=", () => {
    for (const path of [
      "/collections/signature?type=candles",
      "/collections/signature?facet=guadalupe",
      "/collections/signature?sort=price-asc",
      "/collections/signature?sort=price-asc&page=2",
      "/products/vela?variant=12",
    ]) {
      expect(() => buildOpenGraph({ title: "x", path }), path).toThrow("path must be canonical");
    }
  });
});
