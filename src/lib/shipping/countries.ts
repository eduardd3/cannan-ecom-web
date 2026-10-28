// lib/shipping/countries.ts
//
// Where we ship. Must match the Shipping policy (/shipping). Checkout's
// allowed_countries and the structured data both read this list.
// Stripe treats Puerto Rico as its own country, so it's listed separately.
export const SHIP_TO_COUNTRIES = ["US", "PR"] as const;
