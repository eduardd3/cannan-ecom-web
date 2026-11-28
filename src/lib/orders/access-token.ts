// lib/orders/access-token.ts
//
// Private links to a guest order, sent in its emails. Whoever has the link
// can see the order, so the token is 32 random bytes and only its SHA-256 is
// stored: a leaked database hands out no working links. The raw token exists
// only in the email; never log it or store it anywhere else.
//
// Each email mints its own token, so a later email never breaks an earlier
// link. Deleting an order's OrderAccessToken rows revokes its links.
import "server-only";

import { APP_ORIGIN } from "@/lib/app-origin";
import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/lib/tokens";

// generateToken's output: 32 bytes in base64url, no padding, always 43 characters.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** True when the value could be a token; anything else is never hashed or queried. */
export function isWellFormedOrderAccessToken(value: string | undefined | null): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

/** Stores a new token's hash for the order and returns the raw token, for the email link only. */
export async function mintOrderAccessToken(orderId: number): Promise<string> {
  const token = generateToken();
  await prisma.orderAccessToken.create({ data: { orderId, tokenHash: hashToken(token) } });
  return token;
}

/** The order the token opens, or null for a malformed or unknown token (same answer). */
export async function findOrderIdByAccessToken(token: string): Promise<number | null> {
  if (!isWellFormedOrderAccessToken(token)) return null;
  const row = await prisma.orderAccessToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { orderId: true },
  });
  return row?.orderId ?? null;
}

/** Removes a token that was minted but never delivered (its email failed to send). */
export async function discardOrderAccessToken(token: string): Promise<void> {
  await prisma.orderAccessToken.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export type OrderEmailLink = {
  url: string;
  guest: boolean;
  token: string | null; // the minted token, so a failed send can discard it
};

/**
 * Where an order email links. An order with an account links to the account's
 * page (accountPath, e.g. "/orders"); a guest order gets a fresh private link.
 * Origin per deployment (lib/app-origin.ts): a Preview's orders live in the
 * dev database.
 */
export async function orderEmailLink(
  order: { id: number; userId: number | null },
  accountPath: string,
): Promise<OrderEmailLink> {
  if (order.userId !== null) return { url: `${APP_ORIGIN}${accountPath}`, guest: false, token: null };
  const token = await mintOrderAccessToken(order.id);
  return { url: `${APP_ORIGIN}/orders/guest/${token}`, guest: true, token };
}

// Resend's answer to a repeat send under the same idempotency key with a
// different body: an email with that key was already accepted in the last
// 24 hours. A guest email's body changes with every token, so a retry after a
// send that went through (but wasn't recorded) gets this instead of a no-op.
export const REPEAT_SEND_CODE = "invalid_idempotent_request";
