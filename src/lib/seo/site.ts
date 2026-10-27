// lib/seo/site.ts
//
// The one origin every absolute URL is built on: canonical, og:url, the
// sitemap, and structured data. Always the www host: the apex 308s to it.
// Not from an env var, or Preview deployments would point crawlers at
// themselves.

export const SITE_ORIGIN = "https://www.shopcannan.com";

export const SITE_NAME = "Cannan";

/**
 * A path on the site as an absolute URL: "/products/x" →
 * "https://www.shopcannan.com/products/x". An already absolute URL (a CDN
 * image) is returned as it is.
 */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  if (!pathOrUrl.startsWith("/")) throw new Error(`absoluteUrl: expected a path starting with "/", got "${pathOrUrl}"`);
  return `${SITE_ORIGIN}${pathOrUrl}`;
}
