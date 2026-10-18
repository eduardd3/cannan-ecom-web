import type { OrderStatus } from "@/generated/prisma/enums";
import { CUSTOMER_STATUS_LABEL } from "@/lib/orders/format";

//  Keyed on the status, not the label, so every status needs a color and
//  NEEDS_REVIEW renders exactly like PAID.
const STATUS_COLOR: Record<OrderStatus, string> = {
    NEEDS_REVIEW: "text-charcoal",
    PAID: "text-charcoal",
    FULFILLED: "text-charcoal",
    REFUNDED: "text-stone",
    CANCELED: "text-stone",
};

//  The customer-facing status on the orders list and order page.
export default function OrderStatusLabel({ status }: { status: OrderStatus }) {
    return (
        <span className={`text-caption font-medium ${STATUS_COLOR[status]}`}>{CUSTOMER_STATUS_LABEL[status]}</span>
    );
}
