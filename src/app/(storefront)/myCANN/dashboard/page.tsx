import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import OrderRow from "@/app/(storefront)/orders/order-row";
import Container from "@/app/components/container";
import ButtonLink from "@/app/components/form/button-link";
import { textLinkClass } from "@/app/components/form/styles";
import PageHeading from "@/app/components/page-heading";
import SignOutButton from "@/app/components/sign-out-button";
import { getCurrentUser } from "@/lib/cart/session";
import { getShopHref } from "@/lib/catalog/queries";
import { type CustomerOrderSummary, listRecentCustomerOrders } from "@/lib/orders/customer-queries";

export const metadata: Metadata = {
    title: "myCANN | Cannan",
    robots: { index: false },
};

//  44px tall so it's a full tap target; the text sits centered in it.
const viewAllClass = `inline-flex min-h-11 items-center text-label-ui ${textLinkClass}`;

export default async function Dashboard() {
    //  The proxy handles signed-out visitors; this covers a session revoked
    //  since the JWT was issued. It matters now that the page shows the
    //  customer's email and orders.
    const user = await getCurrentUser();
    if (!user) redirect("/id/signin?callbackUrl=/myCANN/dashboard");

    //  Only the fetch is wrapped, as on /orders: a try around JSX can't catch
    //  render errors. null means it failed.
    let orders: CustomerOrderSummary[] | null;
    try {
        orders = await listRecentCustomerOrders(user.id, 3);
    } catch (error) {
        console.error("Failed to load recent orders", error);
        orders = null;
    }
    const hasOrders = orders !== null && orders.length > 0;
    const shopHref = await getShopHref();

    //  Same 760px column as /orders, so the two account pages line up. Left-
    //  aligned here, unlike /orders: the dashboard reads as a page of sections.
    return (
        <Container className="py-10 md:py-16">
            <div className="mx-auto max-w-190">
                {/* TODO(copy): eyebrow. */}
                <PageHeading eyebrow="Mi cuenta" title="myCANN" align="start" />

                <section aria-labelledby="recent-orders" className="mt-2 md:mt-6">
                    <div className="flex items-baseline justify-between gap-4">
                        <h2 id="recent-orders" className="font-serif text-headline-md font-normal text-charcoal">
                            Recent orders
                        </h2>
                        {/* Beside the heading from md up; under the list below it
                            (the copy at the end). Only one is ever displayed, so
                            screen readers hear it once. */}
                        {hasOrders && (
                            <Link href="/orders" className={`hidden md:inline-flex ${viewAllClass}`}>
                                View all orders
                            </Link>
                        )}
                    </div>

                    <RecentOrders orders={orders} shopHref={shopHref} />

                    {hasOrders && (
                        <Link href="/orders" className={`md:hidden ${viewAllClass}`}>
                            View all orders
                        </Link>
                    )}
                </section>

                {/* Sign-out sits last and apart from the orders, so it's easy to
                    find but hard to hit by accident. Spacing alone separates it;
                    no rule above. */}
                <div className="mt-14 flex flex-col gap-4 md:mt-22 md:flex-row md:items-center md:justify-between">
                    <p className="text-caption text-stone">
                        Signed in as <span className="font-medium break-all text-charcoal">{user.email}</span>
                    </p>
                    <SignOutButton className="w-full md:w-48" />
                </div>
            </div>
        </Container>
    );
}

function RecentOrders({ orders, shopHref }: { orders: CustomerOrderSummary[] | null; shopHref: string }) {
    if (orders === null) {
        return (
            <div className="py-8">
                <p className="text-body-md text-charcoal">We couldn&apos;t load your orders.</p>
                <p className="mt-1 text-caption text-stone">Please try again shortly.</p>
            </div>
        );
    }

    //  A compact version of /orders' empty state: the dashboard has more below
    //  it, so no full-height StateBlock or help line here.
    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-start gap-5 py-8">
                <p className="text-body-md text-stone">You haven&apos;t placed an order yet.</p>
                <div className="w-full max-w-80">
                    <ButtonLink href={shopHref}>Shop the collections</ButtonLink>
                </div>
            </div>
        );
    }

    return (
        <ul className="mt-2 divide-y divide-hairline">
            {orders.map((order) => (
                <li key={order.id}>
                    <OrderRow order={order} />
                </li>
            ))}
        </ul>
    );
}
