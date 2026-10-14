import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import Container from "@/app/components/container";
import { formatCents } from "@/lib/cart/format";
import { getCurrentUserId } from "@/lib/cart/session";
import { getCustomerOrder, type CustomerOrder } from "@/lib/orders/customer-queries";
import { addressLines, CUSTOMER_STATUS_LABEL, formatOrderDate, parseOrderId } from "@/lib/orders/format";
import { CARRIER_LABEL, trackingUrl } from "@/lib/orders/shipping";
import OrderLine from "../order-line";

export async function generateMetadata({ params }: PageProps<"/purchases/[id]">): Promise<Metadata> {
    const { id } = await params;
    return { title: `Order #${id} | Cannan`, robots: { index: false } };
}

export default async function PurchaseDetailPage({ params }: PageProps<"/purchases/[id]">) {
    const { id: rawId } = await params;

    //  The proxy handles signed-out visitors; this covers a session revoked
    //  since the JWT was issued.
    const userId = await getCurrentUserId();
    if (!userId) redirect(`/id/signin?callbackUrl=/purchases/${encodeURIComponent(rawId)}`);

    const id = parseOrderId(rawId);
    if (!id) notFound();

    //  Someone else's order is a 404, same as one that doesn't exist.
    const order = await getCustomerOrder(userId, id);
    if (!order) notFound();

    const address = addressLines(order.shippingAddress);

    return (
        <Container className="py-10">
            <Link href="/purchases" className="text-sm text-neutral-600 underline-offset-2 hover:underline">
                ← Purchases
            </Link>
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h1 className="text-xl font-semibold">Order #{order.id}</h1>
                <p className="font-medium">{CUSTOMER_STATUS_LABEL[order.status]}</p>
            </div>
            <p className="text-sm text-neutral-600">Placed {formatOrderDate(order.createdAt)}</p>

            {order.status === "REFUNDED" && (
                <p className="mt-4 rounded border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm">
                    This order was refunded to your original payment method. Questions?{" "}
                    <Link href="/contact" className="underline underline-offset-2">
                        Contact us
                    </Link>
                    .
                </p>
            )}

            {order.shipment && <Shipment shipment={order.shipment} />}

            <ul className="mt-6 divide-y border-y">
                {order.items.map((item) => (
                    <OrderLine key={item.id} item={item} />
                ))}
            </ul>

            <div className="mt-6 flex flex-col-reverse gap-8 sm:flex-row sm:justify-between">
                {address.length > 0 && (
                    <div>
                        <h2 className="font-medium">Shipping address</h2>
                        <address className="mt-1 text-sm not-italic text-neutral-600">
                            {address.map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}
                        </address>
                    </div>
                )}

                <dl className="grid min-w-56 grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm sm:ml-auto">
                    <dt className="text-neutral-600">Subtotal</dt>
                    <dd className="text-right">{formatCents(order.subtotalCents)}</dd>
                    <dt className="text-neutral-600">Shipping</dt>
                    <dd className="text-right">{formatCents(order.shippingCents)}</dd>
                    <dt className="text-neutral-600">Tax</dt>
                    <dd className="text-right">{formatCents(order.taxCents)}</dd>
                    <dt className="mt-1 text-base font-semibold">Total</dt>
                    <dd className="mt-1 text-right text-base font-semibold">{formatCents(order.totalCents)}</dd>
                </dl>
            </div>
        </Container>
    );
}

function Shipment({ shipment }: { shipment: NonNullable<CustomerOrder["shipment"]> }) {
    const href = trackingUrl(shipment.carrier, shipment.trackingNumber);

    return (
        <dl className="mt-6 grid gap-x-6 gap-y-1 rounded border border-neutral-300 px-4 py-3 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-neutral-600">Shipped</dt>
            <dd>{formatOrderDate(shipment.shippedAt)}</dd>
            <dt className="text-neutral-600">Carrier</dt>
            <dd>{CARRIER_LABEL[shipment.carrier]}</dd>
            <dt className="text-neutral-600">Tracking</dt>
            <dd className="break-all font-mono">
                {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                        {shipment.trackingNumber}
                    </a>
                ) : (
                    shipment.trackingNumber
                )}
            </dd>
        </dl>
    );
}
