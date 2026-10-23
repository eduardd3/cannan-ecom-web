import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import Container from "@/app/components/container";
import ButtonLink from "@/app/components/form/button-link";
import { textLinkClass } from "@/app/components/form/styles";
import HelpLine from "@/app/components/help-line";
import PageHeading from "@/app/components/page-heading";
import StateBlock from "@/app/components/state-block";
import { formatCents } from "@/lib/cart/format";
import { getCurrentUserId } from "@/lib/cart/session";
import { CUSTOMER_ORDER_LIMIT, listCustomerOrders } from "@/lib/orders/customer-queries";
import { formatOrderDay } from "@/lib/orders/format";
import OrderStatusLabel from "./order-status-label";
import OrderThumb from "./order-thumb";

export const metadata: Metadata = {
    title: "Your orders | Cannan",
    description: "Your Cannan orders",
    robots: { index: false },
};

type OrderSummary = Awaited<ReturnType<typeof listCustomerOrders>>["orders"][number];

//  Same 760px column as the order page, so the heading doesn't shift when a
//  customer clicks into an order.
function OrdersColumn({ children }: { children: React.ReactNode }) {
    return (
        <Container className="py-10 md:py-16">
            <div className="mx-auto max-w-190">
                <PageHeading eyebrow="Tus pedidos" title="Your orders" />
                {children}
            </div>
        </Container>
    );
}

export default async function OrdersPage() {
    //  The proxy handles signed-out visitors; this covers a session revoked
    //  since the JWT was issued.
    const userId = await getCurrentUserId();
    if (!userId) redirect("/id/signin?callbackUrl=/orders");

    //  Only the fetch is wrapped, as on the cart page: a try around JSX
    //  can't catch render errors.
    let result: Awaited<ReturnType<typeof listCustomerOrders>>;
    try {
        result = await listCustomerOrders(userId);
    } catch (error) {
        console.error("Failed to load orders", error);
        return (
            <OrdersColumn>
                <StateBlock title="We couldn't load your orders." body="Please try again shortly." />
            </OrdersColumn>
        );
    }

    if (result.orders.length === 0) {
        return (
            <OrdersColumn>
                <StateBlock
                    title="You haven't placed an order yet."
                    body="Your orders will appear here after you place them."
                >
                    <ButtonLink href="/products">Shop the collections</ButtonLink>
                    {/* mt-9 plus the column's 12px gap = 48px below the button. */}
                    <HelpLine lead="Can't find an order?" className="mt-9" />
                </StateBlock>
            </OrdersColumn>
        );
    }

    return (
        <OrdersColumn>
            <ul className="divide-y divide-hairline">
                {result.orders.map((order) => (
                    <li key={order.id}>
                        <OrderRow order={order} />
                    </li>
                ))}
            </ul>

            {/* The cut-off note has its own contact link, so no HelpLine with it. */}
            {result.truncated ? (
                <p className="mt-8 text-center text-caption text-stone">
                    Showing your {CUSTOMER_ORDER_LIMIT} most recent orders. For older orders,{" "}
                    <Link href="/contact" className={textLinkClass}>
                        contact us
                    </Link>
                    .
                </p>
            ) : (
                <HelpLine lead="Can't find an order?" className="mt-8 text-center" />
            )}
        </OrdersColumn>
    );
}

//  The whole row is one link. Hover underlines the order number and nudges
//  the arrow; there's no hover background.
function OrderRow({ order }: { order: OrderSummary }) {
    return (
        <Link
            href={`/orders/${order.id}`}
            className="group flex items-center gap-4 py-5"
        >
            <OrderThumb url={order.firstImageUrl} alt="" />

            <div className="min-w-0 flex-1">
                <p className="font-serif text-title-md break-words text-charcoal underline-offset-4 group-hover:underline">
                    Order #{order.id}
                </p>
                <p className="mt-0.5 text-caption text-stone">
                    {formatOrderDay(order.createdAt)} · {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                </p>
            </div>

            <div className="flex shrink-0 flex-col items-end self-start">
                <p className="text-body-md font-medium text-charcoal">{formatCents(order.totalCents)}</p>
                <OrderStatusLabel status={order.status} />
            </div>

            <span
                aria-hidden="true"
                className="shrink-0 font-light text-stone transition group-hover:translate-x-1 group-hover:text-gold-ink"
            >
                →
            </span>
        </Link>
    );
}
