// No server imports: used by admin pages and their client components.
import type { OrderStatus } from "@/generated/prisma/enums";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEEDS_REVIEW: "Needs review",
  PAID: "Paid",
  FULFILLED: "Fulfilled",
  REFUNDED: "Refunded",
  CANCELED: "Canceled",
};

// What the customer sees on /orders. A review is internal, so a
// NEEDS_REVIEW order reads the same as a PAID one.
export const CUSTOMER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEEDS_REVIEW: "Processing",
  PAID: "Processing",
  FULFILLED: "Shipped",
  REFUNDED: "Refunded",
  CANCELED: "Canceled",
};

// Order.id is an Int4; a larger id would make Prisma throw instead of 404.
const MAX_ORDER_ID = 2_147_483_647;

/** A route's [id] segment as an order id, or null if it can't be one. */
export function parseOrderId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 && id <= MAX_ORDER_ID ? id : null;
}

// Pinned to the shop's time zone: the server renders in UTC on Vercel.
const dateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Los_Angeles",
});

export function formatOrderDate(date: Date): string {
  return dateTime.format(date);
}

const day = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "America/Los_Angeles",
});

/** The date only, e.g. "Oct 2, 2026", for the customer's order pages. */
export function formatOrderDay(date: Date): string {
  return day.format(date);
}

// Written by fulfill.ts: Stripe's address plus the recipient's name.
type ShippingAddress = {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

/** Order.shippingAddress (Json) as printable lines; [] when there's none. */
export function addressLines(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const a = value as ShippingAddress;
  const cityLine = [a.city, [a.state, a.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [a.name, a.line1, a.line2, cityLine, a.country].filter((line): line is string => Boolean(line));
}
