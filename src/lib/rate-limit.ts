// One place that knows about Upstash. Routes call checkLimit(); they never
// import @upstash/* directly (same adapter idea as lib/email/client.ts).

import "server-only";
import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Reads UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (or the KV_REST_API_*
// names the Vercel Marketplace integration sets). Missing vars only warn here;
// every limit() call then fails and checkLimit() fails open.
// HTTP-based client: no socket held open between serverless invocations.
const redis = Redis.fromEnv();

// Each limiter gets its own `prefix` so their counters never collide in Redis.
// Numbers are starting points — tune them after watching real traffic.
function limiter(prefix: string, tokens: number, window: Parameters<typeof Ratelimit.slidingWindow>[1]) {
  return new Ratelimit({
    redis,
    prefix: `rl:${prefix}`,
    limiter: Ratelimit.slidingWindow(tokens, window),
  });
}

// Login checks both: per IP+email stops guessing one account, per IP stops
// spraying many accounts from one address. Shared by customer and admin login
// so switching providers doesn't reset the count.
export const loginLimiter = limiter("login", 5, "15 m");
export const loginIpLimiter = limiter("login-ip", 20, "15 m");
export const signupLimiter = limiter("signup", 5, "1 h");
// Per IP only; the per-account email cooldown lives in the route (hasRecentToken).
export const forgotPasswordLimiter = limiter("forgot-password", 5, "1 h");
// Token endpoints: stops token guessing and, on reset, bcrypt-hash flooding.
export const tokenLimiter = limiter("token", 10, "15 m");

export type LimitResult = { ok: boolean; retryAfterSec: number };

/**
 * Checks and consumes one request against `limiter` for `key`.
 *
 * Fails OPEN when Redis is unreachable: an Upstash outage that locks every
 * customer out of login and signup is worse for the shop than a window without
 * throttling. The error is logged so the outage is visible.
 */
export async function checkLimit(limiter: Ratelimit, key: string): Promise<LimitResult> {
  try {
    const { success, reset } = await limiter.limit(key);
    return { ok: success, retryAfterSec: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
  } catch (e) {
    console.error("rate-limit: check failed, allowing request", e);
    return { ok: true, retryAfterSec: 0 };
  }
}

// Vercel sets x-forwarded-for itself (client IP first), so it can't be spoofed
// there. "unknown" only happens locally, where one shared bucket is fine.
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

// One 429 shape for every route that rate-limits.
export function tooManyRequests(retryAfterSec: number) {
  return NextResponse.json(
    { error: "Too many attempts. Please wait a few minutes and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}
