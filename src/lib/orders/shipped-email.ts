// lib/orders/shipped-email.ts
//
// The shipped email: carrier and tracking, sent once per order when an admin
// marks it shipped (PAID → FULFILLED). Tracking corrections afterwards don't
// send another; the order page always shows the current number.
import "server-only";

import { sendOrderShippedEmail } from "@/lib/email/messages";
import { prisma } from "@/lib/prisma";
import { discardOrderAccessToken, orderEmailLink, REPEAT_SEND_CODE } from "./access-token";
import { addressLines, formatOrderDate, shippingName } from "./format";
import { CARRIER_LABEL, trackingUrl } from "./shipping";

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
        userId: true,
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

    // A guest order mints its own link (a new one, so the confirmation
    // email's link keeps working). Inside the try: a failed mint fails the send.
    const link = await orderEmailLink(order, `/orders/${order.id}`);
    const result = await sendOrderShippedEmail(order.email, {
      orderId: order.id,
      shippedOn: formatOrderDate(order.fulfilledAt),
      // A guest has no account name: greet them by the shipping name.
      name: order.user?.name ?? shippingName(order.shippingAddress),
      carrier: CARRIER_LABEL[order.carrier],
      trackingNumber: order.trackingNumber,
      trackingUrl: trackingUrl(order.carrier, order.trackingNumber),
      items: order.items,
      address: addressLines(order.shippingAddress),
      orderUrl: link.url,
    });
    if (!result.ok) {
      // This token never reached anyone.
      if (link.token) await discardOrderAccessToken(link.token);
      if (result.code !== REPEAT_SEND_CODE) {
        console.error(`Order ${orderId}: shipped email failed to send`);
        return "failed";
      }
      // An earlier attempt was delivered but never recorded: record it now.
      await prisma.order.updateMany({
        where: { id: orderId, shippedEmailSentAt: null },
        data: { shippedEmailSentAt: new Date() },
      });
      return "already_sent";
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
