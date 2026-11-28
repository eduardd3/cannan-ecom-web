// lib/orders/attach.ts
//
// Which account a guest order belongs to. One rule, two callers:
//   - the webhook, when it creates a guest order (findVerifiedUserIdByEmail);
//   - email verification, for guest orders placed before (attachGuestOrders).
//
// The rule: only a VERIFIED account with the same normalized email, and only
// orders that have no account yet. Sign-up doesn't prove you own an address;
// verification does. Without it, anyone could sign up with someone else's
// email and read their orders and home address.
import "server-only";

import type { Prisma } from "@/generated/prisma/client";

/** The verified account that owns `email`, or null. `email` must already be normalized. */
export async function findVerifiedUserIdByEmail(
  tx: Prisma.TransactionClient,
  email: string,
): Promise<number | null> {
  const user = await tx.user.findFirst({
    where: { email, emailVerified: { not: null } },
    select: { id: true },
  });
  return user?.id ?? null;
}

/**
 * Attaches every guest order with `email` to `userId`. Call only once the
 * account's email is verified, inside the same transaction. Orders that
 * already have an account are never moved. Returns how many attached.
 */
export async function attachGuestOrders(
  tx: Prisma.TransactionClient,
  userId: number,
  email: string,
): Promise<number> {
  const { count } = await tx.order.updateMany({
    where: { userId: null, email },
    data: { userId },
  });
  return count;
}
