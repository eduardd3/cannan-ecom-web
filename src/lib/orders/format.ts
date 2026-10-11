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
