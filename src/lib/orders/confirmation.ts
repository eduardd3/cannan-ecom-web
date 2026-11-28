// lib/orders/confirmation.ts
//
// The order confirmation email: sent once per order, and only once the order
// is PAID. Clean orders get it from the webhook; NEEDS_REVIEW orders wait for
// an admin to approve them, and a refunded review order never gets one.
import "server-only";

import { formatCents } from "@/lib/cart/format";
import { sendOrderConfirmationEmail } from "@/lib/email/messages";
import { prisma } from "@/lib/prisma";
import { discardOrderAccessToken, orderEmailLink, REPEAT_SEND_CODE } from "./access-token";
import { addressLines, formatOrderDate, shippingName } from "./format";

export type ConfirmationResult = "sent" | "already_sent" | "not_paid" | "not_found" | "failed";

/**
 * Sends the confirmation if the order is PAID and hasn't had one. Safe to
 * call any number of times. Never throws: the order is already saved, so a
 * failed send is logged and leaves confirmationEmailSentAt null.
 */
export async function sendOrderConfirmation(orderId: number): Promise<ConfirmationResult> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        status: true,
        confirmationEmailSentAt: true,
        createdAt: true,
        email: true,
        subtotalCents: true,
        shippingCents: true,
        taxCents: true,
        shippingAddress: true,
        user: { select: { name: true } },
        items: {
          orderBy: { id: "asc" },
          select: { productName: true, variantLabel: true, quantity: true, unitPriceCents: true },
        },
      },
    });
    if (!order) return "not_found";
    if (order.confirmationEmailSentAt) return "already_sent";
    // FULFILLED was PAID first, but by then the shipped email (./shipped-email)
    // is the one that matters, so only PAID sends.
    if (order.status !== "PAID") return "not_paid";

    // A guest order mints its link here, inside the try: if minting fails,
    // the send fails the same way (logged, confirmationEmailSentAt stays null).
    const link = await orderEmailLink(order, "/orders");
    const result = await sendOrderConfirmationEmail(order.email, {
      orderId: order.id,
      placedOn: formatOrderDate(order.createdAt),
      // A guest has no account name: greet them by the shipping name.
      name: order.user?.name ?? shippingName(order.shippingAddress),
      items: order.items.map((item) => ({
        productName: item.productName,
        variantLabel: item.variantLabel,
        quantity: item.quantity,
        lineTotal: formatCents(item.unitPriceCents * item.quantity),
      })),
      subtotal: formatCents(order.subtotalCents),
      shipping: formatCents(order.shippingCents),
      tax: formatCents(order.taxCents),
      total: formatCents(order.subtotalCents + order.shippingCents + order.taxCents),
      address: addressLines(order.shippingAddress),
      orderLink: { url: link.url, guest: link.guest },
    });
    if (!result.ok) {
      // This token never reached anyone.
      if (link.token) await discardOrderAccessToken(link.token);
      if (result.code !== REPEAT_SEND_CODE) {
        console.error(`Order ${orderId}: confirmation email failed to send`);
        return "failed";
      }
      // An earlier attempt was delivered but never recorded: record it now.
      await prisma.order.updateMany({
        where: { id: orderId, confirmationEmailSentAt: null },
        data: { confirmationEmailSentAt: new Date() },
      });
      return "already_sent";
    }

    // Guarded so a concurrent send doesn't overwrite the first timestamp.
    await prisma.order.updateMany({
      where: { id: orderId, confirmationEmailSentAt: null },
      data: { confirmationEmailSentAt: new Date() },
    });
    return "sent";
  } catch (err) {
    console.error(`Order ${orderId}: confirmation email threw`, err instanceof Error ? err.message : err);
    return "failed";
  }
}
