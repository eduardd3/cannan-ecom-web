import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { createUser, resetDb } from "../../../test/db";
import { findOrderIdByAccessToken, mintOrderAccessToken } from "./access-token";
import { sendOrderConfirmation } from "./confirmation";
import { fulfillOrder } from "./fulfillment";
import { sendShippedEmail } from "./shipped-email";

const sendEmail = vi.hoisted(() => vi.fn());
vi.mock("@/lib/email/client", () => ({ sendEmail }));

let sequence = 0;

/** A PAID order written directly; userId null is a guest order. */
async function createPaidOrder(userId: number | null) {
  sequence += 1;
  return prisma.order.create({
    data: {
      userId,
      status: "PAID",
      subtotalCents: 1500,
      shippingCents: 0,
      taxCents: 0,
      stripeCheckoutSessionId: `cs_token_${sequence}`,
      email: "guest@example.com",
      shippingAddress: { name: "Ana Buyer", line1: "1 Main St", city: "Los Angeles", state: "CA", postal_code: "90001", country: "US" },
    },
  });
}

/** The props the template was rendered with on the nth send. */
const emailProps = (call = 0) => sendEmail.mock.calls[call][0].react.props;

/** The raw token at the end of a guest link. */
function tokenFrom(url: string): string {
  const match = url.match(/\/orders\/guest\/([A-Za-z0-9_-]{43})$/);
  if (!match) throw new Error(`not a guest link: ${url}`);
  return match[1];
}

beforeEach(async () => {
  vi.clearAllMocks();
  sendEmail.mockResolvedValue({ ok: true, id: "email_test" });
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("order access tokens", () => {
  it("stores only the hash, and finds the order by the raw token", async () => {
    const order = await createPaidOrder(null);
    const token = await mintOrderAccessToken(order.id);

    const rows = await prisma.orderAccessToken.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(hashToken(token));
    expect(rows[0].tokenHash).not.toContain(token);

    expect(await findOrderIdByAccessToken(token)).toBe(order.id);
  });

  it("returns null for an unknown or malformed token", async () => {
    const order = await createPaidOrder(null);
    const token = await mintOrderAccessToken(order.id);

    expect(await findOrderIdByAccessToken("a".repeat(43))).toBeNull(); // well-formed, unknown
    expect(await findOrderIdByAccessToken(token.slice(1))).toBeNull(); // malformed
    expect(await findOrderIdByAccessToken(hashToken(token))).toBeNull(); // the stored hash isn't a key
  });
});

describe("guest links in order emails", () => {
  it("gives a guest confirmation a private link and the shipping name", async () => {
    const order = await createPaidOrder(null);

    expect(await sendOrderConfirmation(order.id)).toBe("sent");

    const props = emailProps();
    expect(props.orderLink.guest).toBe(true);
    expect(await findOrderIdByAccessToken(tokenFrom(props.orderLink.url))).toBe(order.id);
    expect(props.name).toBe("Ana Buyer");
  });

  it("leaves an account order's confirmation link and greeting unchanged", async () => {
    const customer = await prisma.user.create({ data: { email: "ana@example.com", name: "ana" } });
    const order = await createPaidOrder(customer.id);

    expect(await sendOrderConfirmation(order.id)).toBe("sent");

    const props = emailProps();
    expect(props.orderLink).toEqual({ url: expect.stringMatching(/\/orders$/), guest: false });
    expect(props.name).toBe("ana");
    expect(await prisma.orderAccessToken.count()).toBe(0);
  });

  it("mints a second token for the shipped email, and the first link still works", async () => {
    const admin = await createUser("ADMIN");
    const order = await createPaidOrder(null);
    await sendOrderConfirmation(order.id);
    expect(await fulfillOrder({ orderId: order.id, carrier: "USPS", trackingNumber: "9400100000000000000000", adminId: admin.id })).toEqual({ ok: true });

    expect(await sendShippedEmail(order.id)).toBe("sent");

    const first = tokenFrom(emailProps(0).orderLink.url);
    const second = tokenFrom(emailProps(1).orderUrl);
    expect(second).not.toBe(first);
    expect(await findOrderIdByAccessToken(first)).toBe(order.id);
    expect(await findOrderIdByAccessToken(second)).toBe(order.id);
  });

  it("discards the token when the send fails, and leaves the order unmarked", async () => {
    const order = await createPaidOrder(null);
    sendEmail.mockResolvedValueOnce({ ok: false, error: "Email send failed", code: "internal_server_error" });

    expect(await sendOrderConfirmation(order.id)).toBe("failed");

    expect(await prisma.orderAccessToken.count()).toBe(0);
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.confirmationEmailSentAt).toBeNull();
  });

  it("records an earlier delivery when Resend reports a repeat with a different body", async () => {
    const order = await createPaidOrder(null);
    sendEmail.mockResolvedValueOnce({ ok: false, error: "Email send failed", code: "invalid_idempotent_request" });

    expect(await sendOrderConfirmation(order.id)).toBe("already_sent");

    // The token in this attempt never went out; the delivered email's token
    // was stored by the attempt that sent it.
    expect(await prisma.orderAccessToken.count()).toBe(0);
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.confirmationEmailSentAt).toBeInstanceOf(Date);
  });
});
