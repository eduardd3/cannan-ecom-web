"use server";

import Stripe from "stripe"; // value import: `instanceof Stripe.errors.StripeError` needs it at runtime

import { getCartView } from "@/lib/cart/queries";
import { getCurrentUserId } from "@/lib/cart/session";
import { isCheckoutEnabled } from "@/lib/flags";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import {
  buildLineItems,
  buildReturnUrl,
  buildShippingOptions,
} from "./session-params";

export type CheckoutErrorCode =
  | "CHECKOUT_DISABLED" // CHECKOUT_ENABLED is off in this environment
  | "UNAUTHENTICATED"
  | "EMPTY_CART"
  | "CART_HAS_ISSUES" // a line is limited/unavailable: send them back to /cart
  | "PAYMENT_PROVIDER_ERROR" // Stripe rejected or was unreachable
  | "UNKNOWN";

export type CheckoutResult =
  | { ok: true; clientSecret: string }
  | { ok: false; error: CheckoutErrorCode; message: string };

// Fixed per environment, never derived from the Host header. Unlike the
// password-reset links, previews return to their OWN deployment: they use the
// test-mode Stripe key, so production's return page couldn't find the session.
// VERCEL_BRANCH_URL is a Vercel system env var (hostname, no protocol).
const ORIGIN =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : process.env.VERCEL_ENV === "preview" && process.env.VERCEL_BRANCH_URL
      ? `https://${process.env.VERCEL_BRANCH_URL}`
      : "https://www.shopcannan.com";


/**
 * Creates a Stripe Checkout Session for the signed-in user's current cart and
 * returns the client secret the embedded form needs to mount.
 *
 * Takes NO input on purpose. Everything (who, what, how much) comes from the
 * session and the database. There's nothing for a caller to tamper with.
 */
export async function createCheckoutSession(): Promise<CheckoutResult> {
  // The authoritative gate. A server action is a public POST endpoint, so the
  // page redirect alone wouldn't stop a direct call. First, so a closed
  // checkout never touches the database or Stripe.
  if (!isCheckoutEnabled()) {
    return { ok: false, error: "CHECKOUT_DISABLED", message: "Checkout isn't open yet." };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false, error: "UNAUTHENTICATED", message: "Please sign in to check out." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    // Session outlived the account
    if (!user) {
      return { ok: false, error: "UNAUTHENTICATED", message: "Please sign in to check out." };
    }

    // Soft checks; the authoritative stock check happens in the webhook
    const cart = await getCartView(userId);
    if (cart.lines.length === 0) {
      return { ok: false, error: "EMPTY_CART", message: "Your cart is empty." };
    }
    if (cart.hasIssues) {
      return {
        ok: false,
        error: "CART_HAS_ISSUES",
        message: "Some items in your cart need attention before checkout.",
      };
    }

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded_page",
      line_items: buildLineItems(cart),
      return_url: buildReturnUrl(ORIGIN),

      automatic_tax: { enabled: true },
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: buildShippingOptions(cart.subtotalCents),

      customer_email: user.email, // prefills and locks the email field
      client_reference_id: String(userId), // the webhook reads this to know whose order it is
    });

    if (!session.client_secret) {
      console.error("Checkout session created without a client secret", session.id);
      return { ok: false, error: "UNKNOWN", message: "Couldn't start checkout. Please try again." };
    }
    return { ok: true, clientSecret: session.client_secret };
  } catch (error) {
    // Never return Stripe's raw message to the client: it can mention
    // configuration ("tax registration missing", etc.). Never log the
    // request params either.
    if (error instanceof Stripe.errors.StripeError) {
      console.error("Stripe checkout session failed", error.type, error.code, error.message);
      return {
        ok: false,
        error: "PAYMENT_PROVIDER_ERROR",
        message: "Our payment provider couldn't start checkout. Please try again.",
      };
    }
    console.error("Failed to create checkout session", error);
    return { ok: false, error: "UNKNOWN", message: "Couldn't start checkout. Please try again." };
  }
}
