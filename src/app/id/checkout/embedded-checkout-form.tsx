"use client";

// CLIENT component. Loads Stripe.js in the browser, asks our server action
// for a client secret, and mounts Stripe's form (an iframe served by Stripe:
// card data goes browser → Stripe directly, never through our server).

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { loadStripe } from "@stripe/stripe-js";
import {
    EmbeddedCheckout,
    EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";

import { createCheckoutSession } from "@/lib/checkout/actions";

// ---------------------------------------------------------------------------
// Stripe.js loader: MODULE scope, not inside the component
// ---------------------------------------------------------------------------

// loadStripe injects Stripe's script and returns a Promise<Stripe | null>.
// At module scope it runs once per page load. Inside the component it would
// run on every render and create a new Stripe instance each time.
//
// NEXT_PUBLIC_ vars are inlined into the bundle AT BUILD TIME. Changing the
// value in Vercel requires a redeploy, not just a restart.
//
// null → the component renders a configuration message instead of crashing.
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export default function EmbeddedCheckoutForm() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    // Stripe calls this ONCE when the provider mounts, to get the client secret.
    //
    // useCallback keeps the function identity stable. The provider doesn't
    // support swapping fetchClientSecret after mount, so a new function on
    // every render would be a bug waiting to happen.
    //
    // On failure it must throw (the provider expects a string or a rejection),
    // after either navigating away or setting the message to show.
    const fetchClientSecret = useCallback(async (): Promise<string> => {
        const result = await createCheckoutSession();
        if (result.ok) return result.clientSecret;

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
        throw new Error(result.error);
    }, [router]);

    if (!stripePromise) {
        console.error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY; checkout can't load.");
        return (
            <p className="text-sm text-[#9AA1AB]">
                Payments are temporarily unavailable. Please try again later.
            </p>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col gap-4" aria-live="polite">
                <div className="flex items-center space-x-1">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                    <p className="text-sm text-red-500">{error}</p>
                </div>
                {/* A full reload remounts the provider, which calls
                    fetchClientSecret again. */}
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="h-11 w-full rounded-lg bg-[#F2F3F4] font-semibold text-[#16191E] transition-colors hover:bg-[#9AA1AB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2F3F4]"
                >
                    Try again
                </button>
            </div>
        );
    }

    // `options` is a new object each render. That's fine while
    // fetchClientSecret inside it is stable; wrap it in useMemo if more
    // options are added. No onComplete: with the default redirect behavior,
    // Stripe sends the customer to the return_url after payment.
    return (
        <div id="checkout">
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
                <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
        </div>
    );
}
