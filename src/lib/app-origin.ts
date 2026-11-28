// lib/app-origin.ts
//
// The origin for links that must come back to THIS deployment: Stripe's
// return URL and the links in order emails. A Preview uses the test-mode
// Stripe key and the dev database, so production couldn't find its sessions
// or orders; it links to its own branch URL instead.
//
// Fixed per environment, never derived from the Host header: a spoofed Host
// would otherwise point a customer's link at the attacker's domain.
//
// Not for SEO: canonical, sitemap, and structured data use SITE_ORIGIN
// (lib/seo/site.ts), which is always www.

const PRODUCTION_ORIGIN = "https://www.shopcannan.com";

type OriginEnv = {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  VERCEL_BRANCH_URL?: string; // Vercel system env var: hostname, no protocol
};

export function resolveAppOrigin(env: OriginEnv): string {
  if (env.NODE_ENV === "development") return "http://localhost:3000";
  if (env.VERCEL_ENV === "preview" && env.VERCEL_BRANCH_URL) return `https://${env.VERCEL_BRANCH_URL}`;
  return PRODUCTION_ORIGIN;
}

export const APP_ORIGIN = resolveAppOrigin(process.env);
