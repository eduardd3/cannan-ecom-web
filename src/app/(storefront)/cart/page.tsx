import type { Metadata } from "next";

import Container from "@/app/components/container";
import ButtonLink from "@/app/components/form/button-link";
import { disabledButtonClass } from "@/app/components/form/styles";
import PageHeading from "@/app/components/page-heading";
import StateBlock from "@/app/components/state-block";
import { SummaryList, SummaryRow } from "@/app/components/summary-rows";
import { formatCents } from "@/lib/cart/format";
import { getCartView } from "@/lib/cart/queries";
import { getCurrentCartOwner } from "@/lib/cart/session";
import type { CartView } from "@/lib/cart/types";
import { getShopHref } from "@/lib/catalog/queries";
import { buildShippingOptions } from "@/lib/checkout/session-params";
import { isCatalogEnabled, isCheckoutEnabled } from "@/lib/flags";
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
//  Checkout needs an account, so a guest's button goes through sign-in (which
//  merges the guest cart) and comes back to checkout.
function CheckoutAction({ hasIssues, signedIn }: { hasIssues: boolean; signedIn: boolean }) {
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
    return (
        <ButtonLink href={signedIn ? "/id/checkout" : "/id/signin?callbackUrl=%2Fid%2Fcheckout"}>Checkout</ButtonLink>
    );
}

//  Signed-in users and guests (Cart.guestTokenHash) see the same page. A
//  visitor with no cart, or no cookie yet, gets the empty state.
export default async function Cart() {
    const owner = await getCurrentCartOwner();

    //  Temporary guard: a failed cart read (stale dev Prisma client, missing
    //  migration, DB outage) shows a message instead of the error page. Only
    //  the fetch is wrapped; a try around JSX can't catch render errors.
    let cart: CartView;
    try {
        cart = await getCartView(owner);
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
                    <ButtonLink href={await getShopHref()}>Shop the collections</ButtonLink>
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
                        <CheckoutAction hasIssues={cart.hasIssues} signedIn={owner?.kind === "user"} />
                    </div>
                </section>
            </div>
        </Container>
    );
}
