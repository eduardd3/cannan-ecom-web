import type { Metadata } from "next";
import Link from "next/link";

import Container from "@/app/components/container";
import ButtonLink from "@/app/components/form/button-link";
import { disabledButtonClass, textLinkClass } from "@/app/components/form/styles";
import PageHeading from "@/app/components/page-heading";
import StateBlock from "@/app/components/state-block";
import { SummaryList, SummaryRow } from "@/app/components/summary-rows";
import { formatCents } from "@/lib/cart/format";
import { getCartView } from "@/lib/cart/queries";
import { getCurrentUserId } from "@/lib/cart/session";
import type { CartView } from "@/lib/cart/types";
import { buildShippingOptions } from "@/lib/checkout/session-params";
import { isCatalogEnabled, isCheckoutEnabled, isSignupEnabled } from "@/lib/flags";
import CartLines from "./cart-lines";

export const metadata: Metadata = {
    title: "Cart | Cannan",
    description: "Your Cannan shopping cart",
    robots: { index: false },
};

//  Read from the same function checkout sends to Stripe, so the cart can't
//  promise a rate checkout doesn't charge. Shows the cheapest option.
function shippingLabel(subtotalCents: number): string {
    const amounts = buildShippingOptions(subtotalCents)
        .map((option) => option.shipping_rate_data?.fixed_amount?.amount)
        .filter((amount): amount is number => amount !== undefined);
    if (amounts.length === 0) return "Calculated at checkout";
    const cheapest = Math.min(...amounts);
    return cheapest === 0 ? "Free" : formatCents(cheapest);
}

//  Checkout closed wins over cart issues: fixing the lines wouldn't help.
function CheckoutAction({ hasIssues }: { hasIssues: boolean }) {
    if (!isCheckoutEnabled()) {
        return (
            <button type="button" disabled className={disabledButtonClass}>
                Checkout opens soon.
            </button>
        );
    }
    if (hasIssues) {
        return (
            <>
                <button type="button" disabled aria-describedby="checkout-note" className={disabledButtonClass}>
                    Checkout
                </button>
                <p id="checkout-note" className="text-center text-caption text-stone">
                    Update the items above to continue.
                </p>
            </>
        );
    }
    return <ButtonLink href="/id/checkout">Checkout</ButtonLink>;
}

//  Carts are per-user for now: guest carts (Cart.guestTokenHash) aren't wired
//  up yet, so a signed-out visitor gets a sign-in prompt instead.
export default async function Cart() {
    const userId = await getCurrentUserId();

    if (!userId) {
        return (
            <Container className="py-10 md:py-16">
                <PageHeading eyebrow="Tu carrito" title="Your cart" />
                <StateBlock title="Sign in to see your cart." body="Your cart is saved to your account.">
                    <ButtonLink href="/id/signin?callbackUrl=/cart">Sign in</ButtonLink>
                    {isSignupEnabled() && (
                        <Link href="/id/signup" className={`${textLinkClass} py-2 text-body-md`}>
                            Create an account
                        </Link>
                    )}
                </StateBlock>
            </Container>
        );
    }

    //  Temporary guard: a failed cart read (stale dev Prisma client, missing
    //  migration, DB outage) shows a message instead of the error page. Only
    //  the fetch is wrapped; a try around JSX can't catch render errors.
    let cart: CartView;
    try {
        cart = await getCartView(userId);
    } catch (error) {
        console.error("Failed to load cart", error);
        return (
            <Container className="py-10 md:py-16">
                <PageHeading eyebrow="Tu carrito" title="Your cart" />
                <StateBlock title="We couldn't load your cart." body="Please try again shortly." />
            </Container>
        );
    }

    if (cart.lines.length === 0) {
        return (
            <Container className="py-10 md:py-16">
                <PageHeading eyebrow="Tu carrito" title="Your cart" />
                <StateBlock title="Your cart is empty." body="Browse the collections to start your order.">
                    <ButtonLink href="/products">Shop the collections</ButtonLink>
                </StateBlock>
            </Container>
        );
    }

    return (
        <Container className="py-10 md:py-16">
            <PageHeading eyebrow="Tu carrito" title="Your cart" />

            {/* Lines beside the summary from lg up; the summary stacks below
                them on smaller screens. items-start lets the summary stick. */}
            <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
                <div className="lg:col-span-8">
                    <CartLines lines={cart.lines} catalogEnabled={isCatalogEnabled()} />
                </div>

                {/* top-28 clears the 80px sticky site header, like the policy TOC. */}
                <section
                    aria-labelledby="summary-heading"
                    className="bg-linen p-6 md:p-8 lg:sticky lg:top-28 lg:col-span-4"
                >
                    <h2 id="summary-heading" className="mb-6 font-serif text-headline-md font-normal text-charcoal">
                        Order summary
                    </h2>
                    <SummaryList className="mb-6">
                        <SummaryRow label="Subtotal" value={formatCents(cart.subtotalCents)} />
                        <SummaryRow label="Shipping" value={shippingLabel(cart.subtotalCents)} />
                        <SummaryRow label="Tax" value="Calculated at checkout" />
                    </SummaryList>
                    <div className="flex flex-col gap-2">
                        <CheckoutAction hasIssues={cart.hasIssues} />
                    </div>
                </section>
            </div>
        </Container>
    );
}
