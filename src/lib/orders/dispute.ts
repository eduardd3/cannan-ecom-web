// lib/orders/dispute.ts
//
// Pure functions, no database or server imports: used by the webhook, the
// shipping guard, and admin pages alike. Order.disputeStatus holds Stripe's
// own dispute status as text.

// Stripe statuses that mean the dispute is over. Anything else, including a
// status Stripe adds later, counts as open, so an unknown value blocks
// shipping instead of allowing it.
export const CLOSED_DISPUTE_STATUSES = ["won", "lost", "warning_closed", "prevented"] as const;

const CLOSED: ReadonlySet<string> = new Set(CLOSED_DISPUTE_STATUSES);

/** True while a dispute (or an inquiry, Stripe's warning_* statuses) is unresolved. */
export function isDisputeOpen(status: string | null | undefined): boolean {
  return status != null && !CLOSED.has(status);
}

const DISPUTE_STATUS_LABEL: Record<string, string> = {
  warning_needs_response: "Inquiry, needs response",
  warning_under_review: "Inquiry under review",
  warning_closed: "Inquiry closed",
  needs_response: "Needs response",
  under_review: "Under review",
  won: "Won",
  lost: "Lost",
  prevented: "Prevented",
};

/** "needs_response" → "Needs response"; an unknown status falls back to a readable form of itself. */
export function formatDisputeStatus(status: string): string {
  return DISPUTE_STATUS_LABEL[status] ?? capitalize(status.replaceAll("_", " "));
}

/** Stripe's reason ("product_not_received") → "Product not received". */
export function formatDisputeReason(reason: string): string {
  return capitalize(reason.replaceAll("_", " "));
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
