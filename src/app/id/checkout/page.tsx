import type { Metadata } from "next";
import { redirect } from "next/navigation";

import PageHeading from "@/app/components/page-heading";
import { getCartView } from "@/lib/cart/queries";
import { getCurrentUser } from "@/lib/cart/session";
import type { CartView } from "@/lib/cart/types";
import { isCheckoutEnabled } from "@/lib/flags";
import CheckoutForm from "./checkout-form";
import type { SummaryLine } from "./order-summary";

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

    const user = await getCurrentUser();
    if (!user) redirect("/id/signin?callbackUrl=/id/checkout");

    //  Temporary guard, as on the cart page: a failed read goes back to /cart,
    //  which shows the "couldn't load" message. redirect() throws, so it stays
    //  outside the try.
    let cart: CartView | undefined;
    try {
        cart = await getCartView({ kind: "user", userId: user.id });
    } catch (error) {
        console.error("Failed to load cart for checkout", error);
    }

    //  Nothing to buy, or lines the cart page tells them to fix first.
    //  The authoritative stock check happens in the Stripe webhook.
    if (!cart || cart.lines.length === 0 || cart.hasIssues) redirect("/cart");

    //  Display-only copy of the lines for the summary: names and images. What
    //  is charged comes from the Stripe session the client loads.
    const lines: SummaryLine[] = cart.lines.map((line) => ({
        itemId: line.itemId,
        productName: line.productName,
        variantLabel: line.variantLabel,
        quantity: line.quantity,
        lineTotalCents: line.lineTotalCents,
        imageUrl: line.imageUrl,
    }));

    //  The shell (back link, wordmark, footer) is app/id/layout.tsx.
    return (
        <CheckoutForm
            heading={<PageHeading eyebrow="Finalizar compra" title="Checkout" align="start" />}
            lines={lines}
            email={user.email}
        />
    );
}
