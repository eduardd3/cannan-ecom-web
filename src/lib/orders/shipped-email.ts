// lib/orders/shipped-email.ts
//
// The shipped email: carrier and tracking, sent once per order when an admin
// marks it shipped (PAID → FULFILLED). Tracking corrections afterwards don't
// send another; the order page always shows the current number.
import "server-only";

import { sendOrderShippedEmail } from "@/lib/email/messages";
import { prisma } from "@/lib/prisma";
import { addressLines, formatOrderDate } from "./format";
import { CARRIER_LABEL, trackingUrl } from "./shipping";

// Fixed origin, never derived from the Host header (see email/verification.ts).
const ORIGIN = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://www.shopcannan.com";

export type ShippedEmailResult = "sent" | "already_sent" | "not_fulfilled" | "not_found" | "failed";

/**
 * Sends the shipped email if the order is FULFILLED and hasn't had one. Safe
 * to call any number of times. Never throws: the shipment is already saved,
 * so a failed send is logged and leaves shippedEmailSentAt null.
 */
export async function sendShippedEmail(orderId: number): Promise<ShippedEmailResult> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        shippedEmailSentAt: true,
        carrier: true,
        trackingNumber: true,
        fulfilledAt: true,
        email: true,
        shippingAddress: true,
        user: { select: { name: true } },
        items: {
          orderBy: { id: "asc" },
          select: { productName: true, variantLabel: true, quantity: true },
        },
      },
    });
    if (!order) return "not_found";
    if (order.shippedEmailSentAt) return "already_sent";
    // A refunded order keeps its tracking as history but shouldn't be told
    // it's on the way. The CHECK makes all three set on FULFILLED.
    if (order.status !== "FULFILLED" || !order.carrier || !order.trackingNumber || !order.fulfilledAt) {
      return "not_fulfilled";
    }

    const result = await sendOrderShippedEmail(order.email, {
      orderId: order.id,
      shippedOn: formatOrderDate(order.fulfilledAt),
      name: order.user.name,
      carrier: CARRIER_LABEL[order.carrier],
      trackingNumber: order.trackingNumber,
      trackingUrl: trackingUrl(order.carrier, order.trackingNumber),
      items: order.items,
      address: addressLines(order.shippingAddress),
      orderUrl: `${ORIGIN}/purchases/${order.id}`,
    });
    if (!result.ok) {
      console.error(`Order ${orderId}: shipped email failed to send`);
      return "failed";
    }

    // Guarded so a concurrent send doesn't overwrite the first timestamp.
    await prisma.order.updateMany({
      where: { id: orderId, shippedEmailSentAt: null },
      data: { shippedEmailSentAt: new Date() },
    });
    return "sent";
  } catch (err) {
    console.error(`Order ${orderId}: shipped email threw`, err instanceof Error ? err.message : err);
    return "failed";
  }
}
