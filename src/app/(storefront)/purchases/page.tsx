import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import Container from "@/app/components/container";
import { formatCents } from "@/lib/cart/format";
import { getCurrentUserId } from "@/lib/cart/session";
import { listCustomerOrders } from "@/lib/orders/customer-queries";
import { CUSTOMER_STATUS_LABEL, formatOrderDate } from "@/lib/orders/format";
export const metadata: Metadata = {
    title: "Purchases | Cannan",
    description: "Your Cannan orders",
    robots: { index: false },
};

export default async function PurchasesPage() {
    //  The proxy handles signed-out visitors; this covers a session revoked
    //  since the JWT was issued.
    const userId = await getCurrentUserId();
    if (!userId) redirect("/id/signin?callbackUrl=/purchases");

    //  Only the fetch is wrapped, as on the cart page: a try around JSX
    //  can't catch render errors.
    let result: Awaited<ReturnType<typeof listCustomerOrders>>;
    try {
        result = await listCustomerOrders(userId);
    } catch (error) {
        console.error("Failed to load purchases", error);
        return (
            <Container className="flex flex-1 flex-col items-center justify-center gap-4 py-10">
                <h1 className="text-xl font-semibold">Your Purchases</h1>
                <p>We couldn&apos;t load your orders right now. Please try again shortly.</p>
            </Container>
        );
    }

    if (result.orders.length === 0) {
        return (
            <Container className="flex flex-1 flex-col items-center justify-center gap-4 py-10">
                <h1 className="text-xl font-semibold">Your Purchases</h1>
                <p>You haven&apos;t placed any orders yet.</p>
                <Link href="/" className="underline underline-offset-2">
                    Continue shopping
                </Link>
            </Container>
        );
    }

    return (
        <Container className="py-10">
            <h1 className="text-xl font-semibold">Your Purchases</h1>

            <ul className="mt-6 divide-y border-y">
                {result.orders.map((order) => (
                    <li key={order.id}>
                        <Link
                            href={`/purchases/${order.id}`}
                            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-5 hover:bg-neutral-50"
                        >
                            <div>
                                <p className="font-medium">Order #{order.id}</p>
                                <p className="text-sm text-neutral-600">
                                    {formatOrderDate(order.createdAt)} · {order.itemCount}{" "}
                                    {order.itemCount === 1 ? "item" : "items"}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold">{formatCents(order.totalCents)}</p>
                                <p className="text-sm text-neutral-600">{CUSTOMER_STATUS_LABEL[order.status]}</p>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>

            {result.truncated && (
                <p className="mt-4 text-sm text-neutral-600">
                    Showing your most recent {result.orders.length} orders.
                </p>
            )}
        </Container>
    );
}
