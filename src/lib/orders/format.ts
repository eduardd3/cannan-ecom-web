// No server imports: used by admin pages and their client components.
import type { OrderStatus } from "@/generated/prisma/enums";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEEDS_REVIEW: "Needs review",
  PAID: "Paid",
  FULFILLED: "Fulfilled",
  REFUNDED: "Refunded",
  CANCELED: "Canceled",
};

// Pinned to the shop's time zone: the server renders in UTC on Vercel.
const dateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Los_Angeles",
});

export function formatOrderDate(date: Date): string {
  return dateTime.format(date);
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
