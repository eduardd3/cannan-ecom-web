import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { findOrderIdByAccessToken } from "@/lib/orders/access-token";
import { getOrderForView } from "@/lib/orders/customer-queries";
import OrderDetail from "../../order-detail";

//  The private link in a guest order's emails. The token is the only
//  authority: no session needed, and it keeps working after the order
//  attaches to an account. A malformed token is rejected without a query;
//  malformed and unknown both 404, so neither hints which it was.
//
//  cache(): generateMetadata and the page share one lookup per request.
const loadOrder = cache(async (token: string) => {
    const orderId = await findOrderIdByAccessToken(token);
    return orderId === null ? null : getOrderForView({ id: orderId });
});

//  The token is in the URL: no-referrer keeps it out of the Referer header
//  on links and on the page's own requests (product images from the CDN).
const privatePage = { robots: { index: false }, referrer: "no-referrer" } satisfies Metadata;

export async function generateMetadata({ params }: PageProps<"/orders/guest/[token]">): Promise<Metadata> {
    const { token } = await params;
    const order = await loadOrder(token);
    return order ? { title: `Order #${order.id} | Cannan`, ...privatePage } : privatePage;
}

export default async function GuestOrderPage({ params }: PageProps<"/orders/guest/[token]">) {
    const { token } = await params;
    const order = await loadOrder(token);
    if (!order) notFound();

    return <OrderDetail order={order} showBackLink={false} />;
}
