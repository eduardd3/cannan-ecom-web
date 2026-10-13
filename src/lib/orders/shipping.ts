// lib/orders/shipping.ts
//
// Pure rules for recording a shipment. No server imports: the fulfill form
// (a client component) uses the labels, and the server action uses the parsers.

import type { Carrier } from "@/generated/prisma/enums";

export const CARRIERS = ["USPS", "UPS", "FEDEX", "OTHER"] as const satisfies readonly Carrier[];

export const CARRIER_LABEL: Record<Carrier, string> = {
  USPS: "USPS",
  UPS: "UPS",
  FEDEX: "FedEx",
  OTHER: "Other",
};

export function parseCarrier(value: unknown): Carrier | null {
  return CARRIERS.find((carrier) => carrier === value) ?? null;
}

export const MAX_TRACKING_LENGTH = 40;

/**
 * Cleans up a pasted tracking number: drops spaces (USPS prints them in
 * groups of four) and uppercases. Returns null if what's left isn't
 * plausibly a tracking number.
 */
export function normalizeTrackingNumber(value: string): string | null {
  const cleaned = value.replace(/\s+/g, "").toUpperCase();
  if (cleaned.length < 5 || cleaned.length > MAX_TRACKING_LENGTH) return null;
  if (!/^[A-Z0-9-]+$/.test(cleaned)) return null;
  return cleaned;
}

const TRACKING_URL: Record<Exclude<Carrier, "OTHER">, string> = {
  USPS: "https://tools.usps.com/go/TrackConfirmAction?tLabels=",
  UPS: "https://www.ups.com/track?tracknum=",
  FEDEX: "https://www.fedex.com/fedextrack/?trknbr=",
};

/** The carrier's public tracking page, or null for OTHER. */
export function trackingUrl(carrier: Carrier, trackingNumber: string): string | null {
  if (carrier === "OTHER") return null;
  return TRACKING_URL[carrier] + encodeURIComponent(trackingNumber);
}
