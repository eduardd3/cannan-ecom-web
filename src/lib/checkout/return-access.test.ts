import { describe, expect, it } from "vitest";

import { canViewCheckoutSession } from "./return-access";

const userSession = { client_reference_id: "42", metadata: {} };
const guestSession = { client_reference_id: null, metadata: { guestCartId: "9" } };

describe("canViewCheckoutSession", () => {
  it("shows a user session only to that user", () => {
    expect(canViewCheckoutSession(userSession, { userId: 42, guestCartId: null })).toBe(true);
    expect(canViewCheckoutSession(userSession, { userId: 7, guestCartId: null })).toBe(false);
    expect(canViewCheckoutSession(userSession, { userId: null, guestCartId: null })).toBe(false);
  });

  it("doesn't let a guest cart open a user session", () => {
    expect(canViewCheckoutSession(userSession, { userId: null, guestCartId: 42 })).toBe(false);
  });

  it("shows a guest session only to the browser whose cookie points at its cart", () => {
    expect(canViewCheckoutSession(guestSession, { userId: null, guestCartId: 9 })).toBe(true);
    expect(canViewCheckoutSession(guestSession, { userId: null, guestCartId: 10 })).toBe(false);
    expect(canViewCheckoutSession(guestSession, { userId: null, guestCartId: null })).toBe(false);
  });

  it("doesn't let a signed-in user open a guest session by id alone", () => {
    expect(canViewCheckoutSession(guestSession, { userId: 9, guestCartId: null })).toBe(false);
  });

  it("denies a session with neither owner", () => {
    expect(canViewCheckoutSession({ client_reference_id: null, metadata: {} }, { userId: 1, guestCartId: 1 })).toBe(false);
    expect(canViewCheckoutSession({ client_reference_id: null, metadata: null }, { userId: 1, guestCartId: 1 })).toBe(false);
  });
});
