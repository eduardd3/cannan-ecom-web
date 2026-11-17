import { beforeEach, describe, expect, it, vi } from "vitest";

import { revalidateTag, updateTag } from "next/cache";
import { CATALOG_TAG, invalidateCatalog, invalidateCatalogFromRoute } from "./cache";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), updateTag: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("invalidateCatalog", () => {
  it("expires the catalog tag immediately with updateTag (Server Actions)", () => {
    invalidateCatalog();
    expect(updateTag).toHaveBeenCalledExactlyOnceWith(CATALOG_TAG);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("invalidateCatalogFromRoute", () => {
  it("expires the catalog tag immediately with revalidateTag and expire 0 (Route Handlers)", () => {
    invalidateCatalogFromRoute();
    expect(revalidateTag).toHaveBeenCalledExactlyOnceWith(CATALOG_TAG, { expire: 0 });
    expect(updateTag).not.toHaveBeenCalled();
  });
});

it("tags the catalog as catalog", () => {
  expect(CATALOG_TAG).toBe("catalog");
});
