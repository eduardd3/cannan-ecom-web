// lib/checkout/return-access.ts
//
// Pure: may this visitor see this Checkout Session on the return page?
// Session ids aren't secret enough to authorize on their own (they show up in
// history and logs), so the visitor must also be the one who checked out:
//   - a user session (client_reference_id) needs that user signed in;
//   - a guest session (metadata.guestCartId) needs the browser whose cart
//     cookie points at that cart. For a guest, the cookie is the only proof.
// Paying on one device and opening the link on another gets "not found"; the
// confirmation email covers that case.

import type Stripe from "stripe";

import { GUEST_CART_ID_METADATA_KEY } from "./session-params";

export type ReturnVisitor = {
  userId: number | null; // signed-in user, if any
  guestCartId: number | null; // the cart the guest cookie points to, if any
};

export function canViewCheckoutSession(
  session: Pick<Stripe.Checkout.Session, "client_reference_id" | "metadata">,
  visitor: ReturnVisitor,
): boolean {
  if (session.client_reference_id) {
    return visitor.userId !== null && session.client_reference_id === String(visitor.userId);
  }
  const guestCartId = session.metadata?.[GUEST_CART_ID_METADATA_KEY];
  if (guestCartId) {
    return visitor.guestCartId !== null && guestCartId === String(visitor.guestCartId);
  }
  return false; // a session our checkout didn't create
}
