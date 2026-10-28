// No server imports: used by the sign-in and sign-up client components.

// Where sign-in goes when nothing asked for somewhere else.
export const DEFAULT_SIGNED_IN_PATH = "/myCANN/dashboard";

/**
 * A callbackUrl made safe to redirect to, always as a same-origin relative
 * path, or null.
 *
 * Accepts "/…" paths, but not "//…" or "/\…", which browsers read as another
 * host (a protocol-relative URL). Accepts an absolute URL only when its origin
 * is `origin`, converted to its path + search + hash: the proxy sends
 * signed-out visitors to sign-in with an absolute callbackUrl. Anything else
 * (another origin, javascript:, a bare "foo") is null, never an open redirect.
 *
 * Relative paths are parsed against `origin` too, so tricks the URL parser
 * undoes (a tab or newline in "/\t/evil.com" is stripped to "//evil.com")
 * still fail the origin check.
 */
export function safeCallbackPath(value: string | null | undefined, origin: string): string | null {
  if (!value) return null;
  const relative = value.startsWith("/");
  if (relative && (value.startsWith("//") || value.startsWith("/\\"))) return null;
  let url: URL;
  try {
    url = relative ? new URL(value, origin) : new URL(value);
  } catch {
    return null;
  }
  // javascript:, data:, and the like have the opaque origin "null".
  if (url.origin !== origin) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Where to land once signed in: a safe callbackUrl, else the dashboard. */
export function signedInPath(value: string | null | undefined, origin: string): string {
  return safeCallbackPath(value, origin) ?? DEFAULT_SIGNED_IN_PATH;
}
