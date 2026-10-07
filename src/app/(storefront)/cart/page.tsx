import type { Metadata } from "next";
import Link from "next/link";

import Container from "@/app/components/container";
import { formatCents } from "@/lib/cart/format";
import { getCartView } from "@/lib/cart/queries";
import { getCurrentUserId } from "@/lib/cart/session";
import type { CartView } from "@/lib/cart/types";
import { isCheckoutEnabled } from "@/lib/flags";
import CartLine from "./cart-line";

export const metadata: Metadata = {
    title: "Cart | Cannan",
    description: "Your Cannan shopping cart",
    robots: { index: false },
};

//  Carts are per-user for now: guest carts (Cart.guestTokenHash) aren't wired
//  up yet, so a signed-out visitor gets a sign-in prompt instead.
export default async function Cart() {
    const userId = await getCurrentUserId();

    if (!userId) {
        return (
            <Container className="flex flex-1 flex-col items-center justify-center gap-4 py-10">
                <h1 className="text-xl font-semibold">Your Cart</h1>
                <p>Sign in to see your cart.</p>
                <Link href="/id/signin?callbackUrl=/cart" className="underline underline-offset-2">
                    Sign in
                </Link>
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
            <Container className="flex flex-1 flex-col items-center justify-center gap-4 py-10">
                <h1 className="text-xl font-semibold">Your Cart</h1>
                <p>We couldn&apos;t load your cart right now. Please try again shortly.</p>
            </Container>
        );
    }

    if (cart.lines.length === 0) {
        return (
            <Container className="flex flex-1 flex-col items-center justify-center gap-4 py-10">
                <h1 className="text-xl font-semibold">Your Cart</h1>
                <p>Your cart is empty.</p>
                <Link href="/" className="underline underline-offset-2">
                    Continue shopping
                </Link>
            </Container>
        );
    }

    return (
        <Container className="py-10">
            <h1 className="text-xl font-semibold">Your Cart</h1>

            <ul className="mt-6 divide-y border-y">
                {cart.lines.map((line) => (
                    <CartLine key={line.itemId} line={line} />
                ))}
            </ul>

            <div className="mt-6 flex flex-col items-end gap-3">
                <p className="text-lg">
                    Subtotal <span className="font-semibold">{formatCents(cart.subtotalCents)}</span>
                </p>
                <p className="text-sm text-neutral-600">Shipping and tax are calculated at checkout.</p>

                {/* A styled Link, not a <button> wrapping a <Link>: nesting
                    interactive elements is invalid HTML. */}
                {!isCheckoutEnabled() ? (
                    <>
                        <span
                            aria-disabled="true"
                            className="rounded bg-neutral-300 px-6 py-2 text-neutral-600"
                        >
                            Checkout
                        </span>
                        <p className="text-sm text-neutral-600">Checkout opens soon.</p>
                    </>
                ) : cart.hasIssues ? (
                    <>
                        <span
                            aria-disabled="true"
                            className="rounded bg-neutral-300 px-6 py-2 text-neutral-600"
                        >
                            Checkout
                        </span>
                        <p className="text-sm text-red-700">Fix the items marked above to check out.</p>
                    </>
                ) : (
                    <Link href="/id/checkout" className="rounded bg-[#16191E] px-6 py-2 text-white">
                        Checkout
                    </Link>
                )}
            </div>
        </Container>
    );
}
