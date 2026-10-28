// lib/shipping/countries.ts
//
// Where we ship. Must match the Shipping policy (/shipping). Checkout's
// allowed_countries and the structured data both read this list.
// Stripe treats Puerto Rico as its own country, so it's listed separately.
export const SHIP_TO_COUNTRIES = ["US", "PR"] as const;

// "States" Stripe's address form offers under United States that the policy
// excludes: the other territories, and the freely associated states USPS
// treats as domestic. Names as they read in "We don't ship to … yet."
// PR and the Armed Forces codes (AA, AE, AP) stay allowed.
export const BLOCKED_US_STATES = {
  AS: "American Samoa",
  GU: "Guam",
  MP: "the Northern Mariana Islands",
  VI: "the US Virgin Islands",
  MH: "the Marshall Islands",
  FM: "Micronesia",
  PW: "Palau",
} as const;

export type BlockedState = keyof typeof BLOCKED_US_STATES;

/**
 * The excluded destination an address points to, or null if we ship there.
 * Pure, so the checkout page (before payment) and the webhook (after) share it.
 */
export function blockedDestination(address: {
  country?: string | null;
  state?: string | null;
}): { code: BlockedState; name: string } | null {
  if (address.country?.trim().toUpperCase() !== "US") return null;
  const state = address.state?.trim().toUpperCase();
  if (!state || !Object.hasOwn(BLOCKED_US_STATES, state)) return null;
  const code = state as BlockedState;
  return { code, name: BLOCKED_US_STATES[code] };
}
