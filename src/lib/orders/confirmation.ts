// lib/orders/confirmation.ts
//
// The order confirmation email: sent once per order, and only once the order
// is PAID. Clean orders get it from the webhook; NEEDS_REVIEW orders wait for
// an admin to approve them, and a refunded review order never gets one.
import "server-only";

import { formatCents } from "@/lib/cart/format";
import { sendOrderConfirmationEmail } from "@/lib/email/messages";
import { prisma } from "@/lib/prisma";
import { addressLines, formatOrderDate } from "./format";

// Fixed origin, never derived from the Host header (see email/verification.ts).
const ORIGIN = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://www.shopcannan.com";

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
    // FULFILLED was PAID first, but by then the shipped email (not built yet)
    // is the one that matters, so only PAID sends.
    if (order.status !== "PAID") return "not_paid";

    const result = await sendOrderConfirmationEmail(order.email, {
      orderId: order.id,
      placedOn: formatOrderDate(order.createdAt),
      name: order.user.name,
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
      purchasesUrl: `${ORIGIN}/purchases`,
    });
    if (!result.ok) {
      console.error(`Order ${orderId}: confirmation email failed to send`);
      return "failed";
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
