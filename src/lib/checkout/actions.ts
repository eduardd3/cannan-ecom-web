"use server";

import Stripe from "stripe"; // value import: `instanceof Stripe.errors.StripeError` needs it at runtime

import { headers } from "next/headers";

import { getCartView } from "@/lib/cart/queries";
import { getCurrentCartOwner } from "@/lib/cart/session";
import { isCheckoutEnabled } from "@/lib/flags";
import { prisma } from "@/lib/prisma";
import { checkLimit, checkoutLimiter, clientIp, guestCheckoutLimiter } from "@/lib/rate-limit";
import { SHIP_TO_COUNTRIES } from "@/lib/shipping/countries";
import { getStripe } from "@/lib/stripe";
import {
  buildLineItems,
  buildReturnUrl,
  buildShippingOptions,
  GUEST_CART_ID_METADATA_KEY,
} from "./session-params";

export type CheckoutErrorCode =
  | "CHECKOUT_DISABLED" // CHECKOUT_ENABLED is off in this environment
  | "UNAUTHENTICATED"
  | "EMPTY_CART"
  | "CART_HAS_ISSUES" // a line is limited/unavailable: send them back to /cart
  | "RATE_LIMITED"
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


const EMPTY_CART: CheckoutResult = { ok: false, error: "EMPTY_CART", message: "Your cart is empty." };

/**
 * Creates a Stripe Checkout Session for the current cart (a signed-in user's,
 * or a guest's by cookie) and returns the client secret the checkout page's
 * Stripe Elements initialize from.
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

  // No session and no guest cookie: a visitor with nothing to buy.
  const owner = await getCurrentCartOwner();
  if (!owner) return EMPTY_CART;

  // Users per user id; guests per IP, the way the guest cart actions do it.
  // Before the database and Stripe, so throttled calls cost nothing.
  const limit =
    owner.kind === "user"
      ? await checkLimit(checkoutLimiter, String(owner.userId))
      : await checkLimit(guestCheckoutLimiter, clientIp(await headers()));
  if (!limit.ok) {
    return {
      ok: false,
      error: "RATE_LIMITED",
      message: "Too many checkout attempts. Please wait a few minutes and try again.",
    };
  }

  try {
    // Users only: null when the session outlived the account.
    const user =
      owner.kind === "user"
        ? await prisma.user.findUnique({ where: { id: owner.userId }, select: { email: true } })
        : null;
    if (owner.kind === "user" && !user) {
      return { ok: false, error: "UNAUTHENTICATED", message: "Please sign in to check out." };
    }

    // Soft checks; the authoritative stock check happens in the webhook.
    // cartId is null when the guest's cookie has no cart row behind it.
    const cart = await getCartView(owner);
    if (cart.lines.length === 0 || cart.cartId === null) return EMPTY_CART;
    if (cart.hasIssues) {
      return {
        ok: false,
        error: "CART_HAS_ISSUES",
        message: "Some items in your cart need attention before checkout.",
      };
    }

    // Who the order belongs to, carried in the session for the webhook
    // (parseSession). A guest has no email yet (the checkout page collects
    // it) and no account: the cart id tells the webhook which cart to clear.
    const ownerParams: Pick<Stripe.Checkout.SessionCreateParams, "customer_email" | "client_reference_id" | "metadata"> =
      owner.kind === "user" && user
        ? {
            customer_email: user.email, // prefills and locks the email field
            client_reference_id: String(owner.userId), // the webhook reads this to know whose order it is
          }
        : { metadata: { [GUEST_CART_ID_METADATA_KEY]: String(cart.cartId) } };

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      // "elements": Stripe draws only the address, payment and wallet fields;
      // the page around them (summary, shipping method, Pay button) is ours.
      ui_mode: "elements",
      line_items: buildLineItems(cart),
      return_url: buildReturnUrl(ORIGIN),

      automatic_tax: { enabled: true },
      shipping_address_collection: { allowed_countries: [...SHIP_TO_COUNTRIES] },
      shipping_options: buildShippingOptions(cart.subtotalCents),

      ...ownerParams,
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
