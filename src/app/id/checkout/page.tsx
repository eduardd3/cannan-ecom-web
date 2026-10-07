import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

import { getCartView } from "@/lib/cart/queries";
import { getCurrentUserId } from "@/lib/cart/session";
import type { CartView } from "@/lib/cart/types";
import { isCheckoutEnabled } from "@/lib/flags";
import EmbeddedCheckoutForm from "./embedded-checkout-form";

export const metadata: Metadata = {
    title: "Checkout | Cannan",
    description: "Checkout Page",
    robots: { index: false },
};

//  SERVER component. Its job is gating: decide whether this visitor should
//  even see a payment form. It never talks to Stripe itself; creating a
//  session is a side effect, and rendering must not have side effects.
//
//  The proxy already sends signed-out visitors to sign-in (auth.config.ts);
//  the check here covers a session revoked since the JWT was issued.
export default async function CheckoutPage() {
    //  Checkout closed in this environment: the cart page says why.
    //  createCheckoutSession enforces the same flag.
    if (!isCheckoutEnabled()) redirect("/cart");

    const userId = await getCurrentUserId();
    if (!userId) redirect("/id/signin?callbackUrl=/id/checkout");

    //  Temporary guard, as on the cart page: a failed read goes back to /cart,
    //  which shows the "couldn't load" message. redirect() throws, so it stays
    //  outside the try.
    let cart: CartView | undefined;
    try {
        cart = await getCartView(userId);
    } catch (error) {
        console.error("Failed to load cart for checkout", error);
    }

    //  Nothing to buy, or lines the cart page tells them to fix first.
    //  The authoritative stock check happens in the Stripe webhook.
    if (!cart || cart.lines.length === 0 || cart.hasIssues) redirect("/cart");

    //  The two-column split lives in app/id/layout.tsx — this is just the card.
    return (
        <div className="w-full max-w-xl rounded-xl border border-[#F2F3F4] bg-[#F2F3F4] p-8 shadow-sm">
            <div className="mt-6">
                <EmbeddedCheckoutForm />
            </div>
        </div>
    );
}
/*
<div className="w-full max-w-xl rounded-xl border border-[#2A2F36] bg-[#16191E] p-8 shadow-sm">
            <h1 className="text-center text-xl font-bold text-[#F2F3F4]">
                Checkout
            </h1>
            <p className="mt-2 text-center text-sm text-white">
                <Link href="/cart">Back to cart</Link>
            </p>
            <div className="mt-6">
                <EmbeddedCheckoutForm />
            </div>
        </div>
         */
