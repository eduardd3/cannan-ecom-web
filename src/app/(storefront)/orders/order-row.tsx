import Link from "next/link";

import { formatCents } from "@/lib/cart/format";
import type { CustomerOrderSummary } from "@/lib/orders/customer-queries";
import { formatOrderDay } from "@/lib/orders/format";
import OrderStatusLabel from "./order-status-label";
import OrderThumb from "./order-thumb";

//  One order on /orders and in the dashboard's recent orders. The whole row is
//  one link. Hover underlines the order number and nudges the arrow; there's
//  no hover background.
export default function OrderRow({ order }: { order: CustomerOrderSummary }) {
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
