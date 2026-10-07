import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import Stripe from "stripe"; // value import: `instanceof Stripe.errors.StripeError` needs it at runtime

import { formatCents } from "@/lib/cart/format";
import { getCurrentUserId } from "@/lib/cart/session";
import { getStripe } from "@/lib/stripe";

export const metadata: Metadata = {
    title: "Order Status | Cannan",
    // The session id is in the URL; don't leak it to linked sites.
    referrer: "no-referrer",
    robots: { index: false },
};

//  Where Stripe sends the customer after the embedded form (buildReturnUrl).
//  Read-only: it shows what Stripe says about the session. Creating the order,
//  deducting stock, and clearing the cart belong to the webhook, which runs
//  even if the customer closes the tab before landing here.
export default async function CheckoutReturnPage({
    searchParams,
}: {
    searchParams: Promise<{ session_id?: string | string[] }>;
}) {
    const { session_id: sessionId } = await searchParams;

    //  As on the checkout page, the proxy handles signed-out visitors; this
    //  covers a session revoked since the JWT was issued.
    const userId = await getCurrentUserId();
    if (!userId) redirect("/id/signin?callbackUrl=/id/checkout");

    if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
        return <NotFound />;
    }

    let session: Stripe.Checkout.Session;
    try {
        session = await getStripe().checkout.sessions.retrieve(sessionId);
    } catch (error) {
        //  A made-up or other-mode id is a 404 from Stripe: same answer as
        //  someone else's session. Anything else is a real failure.
        if (error instanceof Stripe.errors.StripeError && error.code === "resource_missing") {
            return <NotFound />;
        }
        console.error("Failed to retrieve checkout session", error);
        return (
            <StatusCard title="We couldn't load your order">
                <p className="mt-4 text-sm text-[#9AA1AB]">
                    If you completed payment, your order is safe. Refresh this page in
                    a moment to see its status.
                </p>
            </StatusCard>
        );
    }

    //  Session ids aren't secret enough to authorize on their own (they show
    //  up in history and logs). Someone else's session looks like a bad link.
    if (session.client_reference_id !== String(userId)) {
        return <NotFound />;
    }

    //  Still open: payment failed or the customer came back without paying.
    //  The checkout page creates a fresh session.
    if (session.status === "open") redirect("/id/checkout");

    if (session.status === "expired") {
        return (
            <StatusCard title="Checkout expired">
                <p className="mt-4 text-sm text-[#9AA1AB]">
                    This checkout session expired before payment. You haven&apos;t been
                    charged, and your cart is still saved.
                </p>
                <p className="mt-4 text-white">
                    <Link href="/cart">Back to cart</Link>
                </p>
            </StatusCard>
        );
    }

    //  complete. "unpaid" here means a delayed payment method (e.g. bank
    //  debit) that hasn't cleared yet; the webhook settles it either way.
    const email = session.customer_details?.email;
    const total = session.amount_total;
    const paid = session.payment_status !== "unpaid";

    return (
        <StatusCard title={paid ? "Thank you for your order" : "Payment processing"}>
            <p className="mt-4 text-sm text-[#9AA1AB]">
                {paid
                    ? "We've received your payment and are getting your order ready."
                    : "Your payment is still processing. Your order is placed once it clears."}
            </p>
            {(total !== null || email) && (
                <dl className="mt-4 flex flex-col gap-1 text-sm">
                    {total !== null && (
                        <div className="flex justify-between">
                            <dt className="text-[#9AA1AB]">Total</dt>
                            <dd className="font-semibold text-[#F2F3F4]">{formatCents(total)}</dd>
                        </div>
                    )}
                    {email && (
                        <div className="flex justify-between">
                            <dt className="text-[#9AA1AB]">Email</dt>
                            <dd className="text-[#F2F3F4]">{email}</dd>
                        </div>
                    )}
                </dl>
            )}
            <p className="mt-6 text-white">
                <Link href="/purchases">View your purchases</Link>
            </p>
            <p className="mt-2 text-white">
                <Link href="/">Continue shopping</Link>
            </p>
        </StatusCard>
    );
}

//  The two-column split lives in app/id/layout.tsx — this is just the card.
function StatusCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="w-full max-w-sm rounded-xl border border-[#2A2F36] bg-[#16191E] p-8 shadow-sm">
            <h1 className="text-center text-xl font-bold text-[#F2F3F4]">{title}</h1>
            {children}
        </div>
    );
}

function NotFound() {
    return (
        <StatusCard title="Order not found">
            <p className="mt-4 text-sm text-[#9AA1AB]">
                This link is invalid or doesn&apos;t belong to your account.
            </p>
            <p className="mt-4 text-white">
                <Link href="/cart">Back to cart</Link>
            </p>
        </StatusCard>
    );
}
