import { describe, expect, it } from "vitest";

import { authConfig } from "../../auth.config";

// The proxy's route rules (auth.config.ts authorized()). true = let through;
// false = send to the sign-in page.
function authorized(pathname: string, signedIn: boolean) {
  const auth = signedIn ? { user: { id: "1", role: "CUSTOMER" } } : null;
  const request = { nextUrl: new URL(`https://www.shopcannan.com${pathname}`) };
  return authConfig.callbacks.authorized({ auth, request } as unknown as Parameters<
    typeof authConfig.callbacks.authorized
  >[0]);
}

describe("authorized: orders", () => {
  it("lets anyone open a guest order link", () => {
    const path = `/orders/guest/${"a".repeat(43)}`;
    expect(authorized(path, false)).toBe(true);
    expect(authorized(path, true)).toBe(true);
  });

  it("keeps account orders behind sign-in", () => {
    for (const path of ["/orders", "/orders/12", "/orders/guest"]) {
      expect(authorized(path, false)).toBe(false);
      expect(authorized(path, true)).toBe(true);
    }
  });
});
