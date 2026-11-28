import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Stripe from "stripe"; // value import: `instanceof Stripe.errors.StripeError` needs it at runtime

import { formatCents } from "@/lib/cart/format";
import { hashGuestToken, readGuestToken } from "@/lib/cart/guest-token";
import { findGuestCartId } from "@/lib/cart/queries";
import { getCurrentUserId } from "@/lib/cart/session";
import { canViewCheckoutSession } from "@/lib/checkout/return-access";
import { getStripe } from "@/lib/stripe";
import ReturnStatus from "./return-status";

export const metadata: Metadata = {
    title: "Order Status | Cannan",
    // The session id is in the URL; don't leak it to linked sites.
    referrer: "no-referrer",
    robots: { index: false },
};

const viewOrders = { label: "View your orders", href: "/orders" };

//  Guests have no orders page, so their main action is to keep shopping, and
//  the secondary "Continue shopping" link would only repeat it.
const guestActions = { primary: { label: "Continue shopping", href: "/" }, showContinueShopping: false };

//  The cart the visitor's guest cookie points to, if any. No cookie, or a
//  malformed one, never reaches the database.
async function currentGuestCartId(): Promise<number | null> {
    const token = await readGuestToken();
    return token ? findGuestCartId(hashGuestToken(token)) : null;
}

//  Where Stripe sends the customer after the embedded form (buildReturnUrl).
//  Read-only: it shows what Stripe says about the session. Creating the order,
//  deducting stock, and clearing the cart belong to the webhook, which runs
//  even if the customer closes the tab before landing here.
//
//  Signed-in users and guests both land here; canViewCheckoutSession decides
//  whether this visitor is the one who checked out.
export default async function CheckoutReturnPage({
    searchParams,
}: {
    searchParams: Promise<{ session_id?: string | string[] }>;
}) {
    const { session_id: sessionId } = await searchParams;

    const userId = await getCurrentUserId();
    //  Before we know whose session it is, the actions follow the visitor.
    const visitorActions = userId !== null ? { primary: viewOrders } : guestActions;

    if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
        return <NotFound actions={visitorActions} />;
    }

    let session: Stripe.Checkout.Session;
    try {
        session = await getStripe().checkout.sessions.retrieve(sessionId);
    } catch (error) {
        //  A made-up or other-mode id is a 404 from Stripe: same answer as
        //  someone else's session. Anything else is a real failure.
        if (error instanceof Stripe.errors.StripeError && error.code === "resource_missing") {
            return <NotFound actions={visitorActions} />;
        }
        console.error("Failed to retrieve checkout session", error);
        return (
            <ReturnStatus
                title="We couldn't load your order"
                body="If you completed payment, your order is safe. Refresh this page in a moment to see its status."
                {...visitorActions}
            />
        );
    }

    //  Session ids aren't secret enough to authorize on their own (they show
    //  up in history and logs). Someone else's session looks like a bad link.
    //  The guest cookie is only read for a guest session.
    const guestCartId = session.client_reference_id ? null : await currentGuestCartId();
    if (!canViewCheckoutSession(session, { userId, guestCartId })) {
        return <NotFound actions={visitorActions} />;
    }

    //  Still open: payment failed or the customer came back without paying.
    //  The checkout page creates a fresh session.
    if (session.status === "open") redirect("/id/checkout");

    if (session.status === "expired") {
        return (
            <ReturnStatus
                eyebrow="Pago no completado"
                title="Checkout expired"
                body="You haven't been charged, and your cart is still saved."
                primary={{ label: "Return to cart", href: "/cart" }}
            />
        );
    }

    //  complete. "unpaid" here means a delayed payment method (e.g. bank
    //  debit) that hasn't cleared yet; the webhook settles it either way.
    const email = session.customer_details?.email ?? undefined;
    const total = session.amount_total;
    const paid = session.payment_status !== "unpaid";

    return (
        <ReturnStatus
            eyebrow="Gracias"
            title={paid ? "Thank you for your order" : "Your payment is processing"}
            body={
                paid
                    ? "We've received your payment and are preparing your order. A confirmation is on its way to your email."
                    : "We'll email you as soon as it's confirmed. Your order ships after that."
            }
            details={{ total: total !== null ? formatCents(total) : undefined, email }}
            //  Whose session it is, not who's signed in: a guest order has no
            //  orders page to view.
            {...(session.client_reference_id ? { primary: viewOrders } : guestActions)}
        />
    );
}

function NotFound({ actions }: { actions: { primary: { label: string; href: string }; showContinueShopping?: boolean } }) {
    return (
        <ReturnStatus
            title="Order not found"
            body="We couldn't find this checkout."
            {...actions}
            showContact
        />
    );
}
