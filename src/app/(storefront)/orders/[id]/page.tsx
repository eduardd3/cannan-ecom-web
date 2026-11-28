import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getCurrentUserId } from "@/lib/cart/session";
import { getCustomerOrder } from "@/lib/orders/customer-queries";
import { parseOrderId } from "@/lib/orders/format";
import OrderDetail from "../order-detail";

export async function generateMetadata({ params }: PageProps<"/orders/[id]">): Promise<Metadata> {
    const { id } = await params;
    return { title: `Order #${id} | Cannan`, robots: { index: false } };
}

export default async function OrderDetailPage({ params }: PageProps<"/orders/[id]">) {
    const { id: rawId } = await params;

    //  The proxy handles signed-out visitors; this covers a session revoked
    //  since the JWT was issued.
    const userId = await getCurrentUserId();
    if (!userId) redirect(`/id/signin?callbackUrl=/orders/${encodeURIComponent(rawId)}`);

    const id = parseOrderId(rawId);
    if (!id) notFound();

    //  Someone else's order is a 404, same as one that doesn't exist.
    const order = await getCustomerOrder(userId, id);
    if (!order) notFound();

    return <OrderDetail order={order} showBackLink />;
}
