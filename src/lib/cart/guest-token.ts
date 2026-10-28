// lib/cart/guest-token.ts
//
// The guest cart cookie. A signed-out visitor's cart is found by the SHA-256
// of a random token the browser holds; the raw token is never stored, logged,
// or put in a URL. Set only by the cart actions, cleared only by the sign-in
// merge, and never on a page view.
import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

// Safari drops every Secure cookie on http://localhost, whatever its name, and
// a __Host- cookie must be Secure. So `next dev` alone uses a plain,
// non-Secure cookie; every deployed environment (HTTPS) gets the __Host-
// prefix, which stops a subdomain from planting or overwriting it.
const DEV = process.env.NODE_ENV === "development";
export const GUEST_COOKIE_NAME = DEV ? "cannan_cart" : "__Host-cannan_cart";

// Pruning (roadmap 4.6) removes guest carts idle this long, by Cart.updatedAt.
const MAX_AGE_SEC = 60 * 60 * 24 * 30;

// 32 random bytes in base64url, no padding: always exactly 43 characters.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

// One shape for set, refresh, and clear, so a clear always matches the cookie
// it's meant to remove.
function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: !DEV, sameSite: "lax", path: "/", maxAge } as const;
}

export function generateGuestToken(): string {
  return randomBytes(32).toString("base64url");
}

// SHA-256, not bcrypt: a 32-byte random token can't be guessed, so a slow hash
// buys nothing. The hash only keeps a leaked database from handing out
// working cart cookies.
export function hashGuestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isWellFormedGuestToken(value: string | undefined | null): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

/** True when the browser sent the cookie at all, well-formed or not. */
export async function hasGuestCookie(): Promise<boolean> {
  return (await cookies()).has(GUEST_COOKIE_NAME);
}

/** The cookie's token, or null when it's missing or malformed (never hashed or queried). */
export async function readGuestToken(): Promise<string | null> {
  const value = (await cookies()).get(GUEST_COOKIE_NAME)?.value;
  return isWellFormedGuestToken(value) ? value : null;
}

/** Sets the cookie with a fresh 30-day maxAge. Server actions only. */
export async function setGuestTokenCookie(token: string): Promise<void> {
  (await cookies()).set(GUEST_COOKIE_NAME, token, cookieOptions(MAX_AGE_SEC));
}

/** Restarts the 30-day clock on the cookie the browser already holds. */
export async function refreshGuestTokenCookie(): Promise<void> {
  const token = await readGuestToken();
  if (token) await setGuestTokenCookie(token);
}

// maxAge 0 with the same attributes, not cookies().delete(): the browser
// rejects a __Host- Set-Cookie without Secure and Path=/, even one that clears.
export async function clearGuestTokenCookie(): Promise<void> {
  (await cookies()).set(GUEST_COOKIE_NAME, "", cookieOptions(0));
}
