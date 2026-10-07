// lib/stripe.ts
//
// The one place the server-side Stripe client is created. Everything that
// talks to Stripe (checkout action, webhook, fulfillment, return page)
// imports getStripe() from here.
import "server-only"; // the secret key must never end up in a client bundle

import Stripe from "stripe";

// ---------------------------------------------------------------------------
// API version
// ---------------------------------------------------------------------------

// Pinned to the version the installed stripe package (23.0.0) was built for.
// No cast: if this doesn't match the package, TypeScript flags it.
//
// When you upgrade the package later, bump this deliberately, after reading
// Stripe's API changelog for what changed between the two versions.
const STRIPE_API_VERSION = "2026-09-30.endive" satisfies Stripe.LatestApiVersion;

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

/**
 * Reads a required env var, failing with a clear message naming the variable.
 * Also checks the expected prefix, which catches the classic mistake of
 * pasting the publishable key where the secret key belongs.
 */
function requireEnv(name: string, expectedPrefixes: string[]): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);

  // Never include the value itself in the message: errors end up in logs.
  if (!expectedPrefixes.some((prefix) => value.startsWith(prefix))) {
    throw new Error(`${name} doesn't look right (expected ${expectedPrefixes.join(" or ")}...)`);
  }
  return value;
}

export function isLiveMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return key.startsWith("sk_live_") || key.startsWith("rk_live_");
}

let client: Stripe | null = null;

/**
 * Returns the shared Stripe client, creating it on first use.
 *
 * Lazy (inside a function) rather than at module top level, so a missing key
 * fails the first REQUEST that needs Stripe, not every build or page that
 * merely imports this file.
 */
export function getStripe(): Stripe {
  if (!client) {
    const key = requireEnv("STRIPE_SECRET_KEY", ["sk_test_", "sk_live_", "rk_test_", "rk_live_"]);
    client = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
      appInfo: { name: "shopcannan" }, // shows up in Stripe's request logs
    });
  }
  return client;
}

/**
 * The webhook signing secret, used only by the webhook route to verify that
 * a request really came from Stripe.
 */
export function getWebhookSecret(): string {
  return requireEnv("STRIPE_WEBHOOK_SECRET", ["whsec_"]);
}
