// lib/checkout/fulfill.ts
//
// Turns a PAID Checkout Session into an Order, exactly once.
// Called by the webhook (both checkout.session.completed and
// checkout.session.async_payment_succeeded). Safe to call any number of
// times for the same session.
import "server-only";

import { Prisma } from "@/generated/prisma/client";

import { formatVariantLabel } from "@/lib/cart/queries";
import { adjustStock } from "@/lib/inventory/adjust";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { checkSubtotal, parseSession, type ParsedSession } from "./parse-session";

export type FulfillResult =
  | { status: "created"; orderId: number; needsReview: boolean }
  | { status: "already_fulfilled"; orderId: number }
  | { status: "not_paid" }; // e.g. async payment still pending: wait for the next event

// Upper bound for one page of line items. Your cart caps quantity per line,
// not line count, but a 100-line cart isn't a realistic order for this shop.
const MAX_LINE_ITEMS = 100;

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function fulfillCheckout(sessionId: string): Promise<FulfillResult> {
  // PHASE 1 — cheap idempotency check 
  const existing = await prisma.order.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
    select: { id: true },
  });
  if (existing) return { status: "already_fulfilled", orderId: existing.id };

  // PHASE 2 — read from Stripe (OUTSIDE any transaction)
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  // "unpaid" (async payment pending) or "no_payment_required": nothing to fulfill yet
  if (session.payment_status !== "paid") return { status: "not_paid" };

  const page = await stripe.checkout.sessions.listLineItems(sessionId, {
    limit: MAX_LINE_ITEMS,
    expand: ["data.price.product"], // needed to read product.metadata.variantId
  });
  if (page.has_more) {
    throw new Error(`Session ${sessionId} has more than ${MAX_LINE_ITEMS} line items`);
  }

  const parsed = parseSession(session, page.data);
  const subtotalProblem = checkSubtotal(parsed);

  // PHASE 3 — write everything in one transaction
  try {
    return await prisma.$transaction((tx) => createOrder(tx, parsed, subtotalProblem));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Another delivery of this event won the race and created the order.
      const winner = await prisma.order.findUnique({
        where: { stripeCheckoutSessionId: sessionId },
        select: { id: true },
      });
      if (winner) return { status: "already_fulfilled", orderId: winner.id };
      // No order for this session: the collision was on something else
      // (e.g. stripePaymentIntentId). Not a race, so don't hide it.
    }
    throw err; // let the webhook return 500 so Stripe retries
  }
}

// ---------------------------------------------------------------------------
// The transaction body
// ---------------------------------------------------------------------------

async function createOrder(
  tx: Prisma.TransactionClient,
  parsed: ParsedSession,
  subtotalProblem: string | null,
): Promise<FulfillResult> {
  const variantIds = parsed.lines.map((line) => line.variantId);

  // 1. Snapshot data for every variant in one query. A missing variant means
  //    something is genuinely wrong (sold variants are protected by onDelete:
  //    Restrict, and products are archived rather than deleted). Throwing →
  //    500 → Stripe keeps retrying for days while the dashboard flags it,
  //    instead of silently losing a paid order.
  const variants = await tx.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, sku: true, name: true, value: true, product: { select: { name: true } } },
  });
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
  const missing = variantIds.filter((id) => !variantsById.has(id));
  if (missing.length > 0) {
    throw new Error(`Session ${parsed.sessionId} references unknown variants: ${missing.join(", ")}`);
  }

  // 2. The order and its items. If the unique constraint on
  //    stripeCheckoutSessionId fires, it fires HERE, before any stock moves.
  const order = await tx.order.create({
    data: {
      userId: parsed.userId,
      status: "PAID",
      subtotalCents: parsed.subtotalCents,
      shippingCents: parsed.shippingCents,
      taxCents: parsed.taxCents,
      currency: parsed.currency,
      email: parsed.email,
      shippingAddress: parsed.shippingAddress
        ? { name: parsed.shippingName, ...parsed.shippingAddress }
        : Prisma.DbNull,
      stripeCheckoutSessionId: parsed.sessionId,
      stripePaymentIntentId: parsed.paymentIntentId,
      items: {
        create: parsed.lines.map((line) => {
          const variant = variantsById.get(line.variantId)!;
          return {
            variantId: line.variantId,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents, // what Stripe charged
            productName: variant.product.name,
            variantLabel: formatVariantLabel(variant.name, variant.value),
            sku: variant.sku,
          };
        }),
      },
    },
    select: { id: true },
  });

  // 3. Decrement stock in ascending variantId order so concurrent orders can't
  //    deadlock. A short line is left untouched and flagged; lines that had
  //    stock ARE deducted. On approval, the admin writes ORDER_PLACED only for
  //    lines with no ORDER_PLACED adjustment on this order yet.
  const shortfalls: string[] = [];
  const sortedLines = [...parsed.lines].sort((a, b) => a.variantId - b.variantId);
  for (const line of sortedLines) {
    const result = await adjustStock(tx, {
      variantId: line.variantId,
      delta: -line.quantity,
      reason: "ORDER_PLACED",
      orderId: order.id,
    });
    if (result.ok) continue;
    if (result.reason === "VARIANT_NOT_FOUND") {
      // Step 1 already proved it exists, so this is a bug.
      throw new Error(`Variant ${line.variantId} vanished mid-transaction`);
    }
    const { sku } = variantsById.get(line.variantId)!;
    shortfalls.push(`${sku}: ordered ${line.quantity}, available ${result.available}`);
  }

  // 4. Anything a person needs to look at sends the order to review.
  const reasons = subtotalProblem ? [...shortfalls, subtotalProblem] : shortfalls;
  if (reasons.length > 0) {
    await tx.order.update({
      where: { id: order.id },
      data: { status: "NEEDS_REVIEW", reviewReason: reasons.join("; ") },
    });
  }

  // 5. Remove the purchased lines from the cart, and ONLY those.
  await tx.cartItem.deleteMany({
    where: { cart: { userId: parsed.userId }, variantId: { in: variantIds } },
  });

  return { status: "created", orderId: order.id, needsReview: reasons.length > 0 };
}