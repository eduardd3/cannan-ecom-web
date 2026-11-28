import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { TokenType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { issueToken } from "@/lib/tokens";
import { createUser, resetDb } from "../../../test/db";

// The route checks the limiter first; Upstash isn't reachable in tests.
vi.mock("@/lib/rate-limit", () => ({
  checkLimit: async () => ({ ok: true, retryAfterSec: 0 }),
  clientIp: () => "203.0.113.7",
  tokenLimiter: {},
  tooManyRequests: () => new Response(null, { status: 429 }),
}));

const { POST: confirmVerification } = await import("@/app/api/verification/confirm/route");

let sequence = 0;

/** A bare order: these tests only care who owns it. */
async function createOrder(email: string, userId: number | null = null) {
  sequence += 1;
  return prisma.order.create({
    data: {
      userId,
      email,
      subtotalCents: 1500,
      shippingCents: 0,
      taxCents: 0,
      stripeCheckoutSessionId: `cs_test_attach_${sequence}`,
    },
  });
}

async function verify(userId: number) {
  const token = await issueToken(userId, TokenType.EMAIL_VERIFICATION);
  return confirmVerification(
    new Request("http://localhost/api/verification/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    }),
  );
}

const ownerOf = async (orderId: number) =>
  (await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { userId: true } })).userId;

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("attaching guest orders on email verification", () => {
  it("attaches the account's guest orders and leaves everything else alone", async () => {
    const user = await prisma.user.create({ data: { email: "ana@example.com" } });
    const someoneElse = await createUser();

    const guestOrder = await createOrder("ana@example.com");
    const otherEmail = await createOrder("not-ana@example.com");
    const ownedElsewhere = await createOrder("ana@example.com", someoneElse.id);

    const response = await verify(user.id);
    expect(response.status).toBe(200);

    expect(await ownerOf(guestOrder.id)).toBe(user.id);
    expect(await ownerOf(otherEmail.id)).toBeNull();
    expect(await ownerOf(ownedElsewhere.id)).toBe(someoneElse.id);
  });

  it("still attaches when the account was already verified", async () => {
    const verifiedAt = new Date("2026-01-01T00:00:00Z");
    const user = await prisma.user.create({ data: { email: "ana@example.com", emailVerified: verifiedAt } });
    const guestOrder = await createOrder("ana@example.com");

    expect((await verify(user.id)).status).toBe(200);

    expect(await ownerOf(guestOrder.id)).toBe(user.id);
    // The original verification time is kept.
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.emailVerified).toEqual(verifiedAt);
  });

  it("attaches nothing for an invalid token", async () => {
    await prisma.user.create({ data: { email: "ana@example.com" } });
    const guestOrder = await createOrder("ana@example.com");

    const response = await confirmVerification(
      new Request("http://localhost/api/verification/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "not-a-real-token" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await ownerOf(guestOrder.id)).toBeNull();
  });
});
