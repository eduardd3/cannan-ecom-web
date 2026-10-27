"use client";

//  CLIENT component. Asks our server action for a Checkout Session, then
//  mounts Stripe's Elements from its client secret. Card and address data go
//  browser → Stripe directly (the fields are Stripe iframes), never through
//  our server.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { CheckoutElementsProvider, useCheckoutElements } from "@stripe/react-stripe-js/checkout";

import FormBanner from "@/app/components/form/form-banner";
import { createCheckoutSession } from "@/lib/checkout/actions";
import CheckoutLayout from "./checkout-layout";
import CheckoutPanel from "./checkout-panel";
import type { SummaryLine } from "./order-summary";
import { stripeAppearance, stripeFonts } from "./stripe-appearance";

// loadStripe at MODULE scope runs once per page load; inside the component it
// would create a new Stripe instance on every render. NEXT_PUBLIC_ vars are
// inlined at build time, so changing the key in Vercel needs a redeploy.
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

type CheckoutFormProps = {
    heading: ReactNode;
    lines: SummaryLine[];
    email: string;
};

export default function CheckoutForm({ heading, lines, email }: CheckoutFormProps) {
    const router = useRouter();
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(stripePromise ? null : "Payments are temporarily unavailable. Please try again later.");

    //  Creating a session is a side effect, so it runs in an effect, not
    //  during render. The ref stops React's dev-mode double effect from
    //  creating two sessions; refs survive that simulated remount.
    const started = useRef(false);
    useEffect(() => {
        if (started.current || !stripePromise) return;
        started.current = true;

        createCheckoutSession()
            .then((result) => {
                if (result.ok) {
                    setClientSecret(result.clientSecret);
                    return;
                }
                switch (result.error) {
                    case "UNAUTHENTICATED":
                        router.replace("/id/signin?callbackUrl=/id/checkout");
                        break;
                    case "EMPTY_CART":
                    case "CART_HAS_ISSUES":
                        router.replace("/cart");
                        break;
                    default:
                        setError(result.message);
                }
            })
            .catch((cause) => {
                console.error("createCheckoutSession failed", cause);
                setError("Couldn't start checkout. Please try again.");
            });
    }, [router]);

    //  One stable options object per session: the provider re-initializes
    //  when appearance or fonts change identity.
    const options = useMemo(
        () =>
            clientSecret
                ? { clientSecret, elementsOptions: { appearance: stripeAppearance, fonts: stripeFonts, loader: "auto" as const } }
                : null,
        [clientSecret],
    );

    if (!stripePromise) console.error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY; checkout can't load.");

    if (error) {
        return (
            <CheckoutLayout heading={heading} lines={lines} totals={null}>
                {/* A full reload remounts everything and asks for a new session. */}
                <FormBanner variant="error" action={{ label: "Try again", onClick: () => window.location.reload() }}>
                    {error}
                </FormBanner>
            </CheckoutLayout>
        );
    }

    if (!options || !stripePromise) {
        return (
            <CheckoutLayout heading={heading} lines={lines} totals={null}>
                <FormSkeleton />
            </CheckoutLayout>
        );
    }

    return (
        <CheckoutElementsProvider stripe={stripePromise} options={options}>
            <SessionState heading={heading} lines={lines} email={email} />
        </CheckoutElementsProvider>
    );
}

//  Inside the provider: Stripe is loading the session, failed, or ready.
function SessionState({ heading, lines, email }: CheckoutFormProps) {
    const result = useCheckoutElements();

    if (result.type === "loading") {
        return (
            <CheckoutLayout heading={heading} lines={lines} totals={null}>
                <FormSkeleton />
            </CheckoutLayout>
        );
    }
    if (result.type === "error") {
        console.error("Stripe checkout failed to load", result.error.message);
        return (
            <CheckoutLayout heading={heading} lines={lines} totals={null}>
                <FormBanner variant="error" action={{ label: "Try again", onClick: () => window.location.reload() }}>
                    Our payment provider couldn&apos;t start checkout. Please try again.
                </FormBanner>
            </CheckoutLayout>
        );
    }
    return <CheckoutPanel checkout={result.checkout} heading={heading} lines={lines} email={email} />;
}

//  Linen blocks in the shape of the fields, so the page doesn't jump when
//  Stripe's own loader takes over.
function FormSkeleton() {
    return (
        <div aria-hidden="true" className="flex flex-col gap-4">
            <div className="h-12 bg-linen" />
            <div className="mt-8 h-4 w-28 bg-linen" />
            <div className="h-12 bg-linen" />
            <div className="h-12 bg-linen" />
            <div className="mt-8 h-4 w-28 bg-linen" />
            <div className="h-12 bg-linen" />
        </div>
    );
}
