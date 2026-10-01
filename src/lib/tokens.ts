// src/lib/tokens.ts
// Single-use, expiring tokens for password reset and email verification.
// Only the SHA-256 hash is stored; the plaintext exists once, in the email.

import "server-only"; // build fails if a client component ever imports this file
import { randomBytes, createHash } from "node:crypto";
import { Prisma, TokenType } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

// Lifetimes live here, not as function parameters, so no route can issue
// a 24-hour reset token by accident. Tune the numbers; keep the shape.
const TOKEN_TTL_MS: Record<TokenType, number> = {
  PASSWORD_RESET: 60 * 60 * 1000,           // 1 hour
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,  // 24 hours
};

type Db = Prisma.TransactionClient;

/** 32 random bytes from the OS CSPRNG, as a URL-safe string (~43 chars). */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Deterministic SHA-256 so the result can be looked up via the unique index. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a token for the user and returns the PLAINTEXT.
 * This return value is the only time the plaintext exists: it goes into the
 * email and nowhere else. Never log it.
 *
 * TransactionClient has no $transaction, so this can't wrap itself. Callers
 * that need the invalidate + create to be atomic pass a `tx`.
 */
export async function issueToken(
  userId: number,
  type: TokenType,
  db: Db = prisma,
): Promise<string> {
  const token = generateToken();
  const now = new Date();

  // Invalidate this user's older unused tokens of the same type.
  await db.token.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: now },
  });

  await db.token.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + TOKEN_TTL_MS[type]),
    },
  });

  return token;
}

/** True if the user was issued a token of this type within the window. */
export async function hasRecentToken(
  userId: number,
  type: TokenType,
  windowMs: number,
  db: Db = prisma,
): Promise<boolean> {
  // Includes used/invalidated tokens: the cooldown is about "when did we
  // last email them", not "is a token still live".
  const recent = await db.token.findFirst({
    where: { userId, type, createdAt: { gte: new Date(Date.now() - windowMs) } },
    select: { id: true },
  });
  return recent !== null;
}

/**
 * Atomically claims a token. Returns the userId on success, null on ANY
 * failure (unknown, expired, already used, wrong type). Callers can't and
 * shouldn't tell those apart.
 *
 * Pass `tx` from the reset route so the claim, password update, and
 * sessionVersion bump commit or roll back together.
 */
export async function consumeToken(
  token: string,
  type: TokenType,
  db: Db = prisma,
): Promise<number | null> {
  const now = new Date();

  const claimed = await db.token.updateManyAndReturn({
    where: {
      tokenHash: hashToken(token),
      type,
      usedAt: null,
      expiresAt: { gt: now },
    },
    data: { usedAt: now },
    select: { userId: true },
  });

  return claimed.length === 1 ? claimed[0].userId : null;
}
