import Link from "next/link";

import { formatCents } from "@/lib/cart/format";
import type { CustomerOrderItem } from "@/lib/orders/customer-queries";
import OrderThumb from "./order-thumb";

//  One item of a past order, on the order page. The name and image link
//  only while the product is ACTIVE (productHref is null otherwise).
export default function OrderLine({ item }: { item: CustomerOrderItem }) {
    const unitLine = `${item.quantity} × ${formatCents(item.unitPriceCents)}`;

    return (
        <li className="flex items-start gap-4 py-5 first:pt-0">
            <OrderThumb url={item.imageUrl} alt={item.imageAlt ?? item.productName} href={item.productHref} />

            <div className="min-w-0 flex-1">
                <h3 className="font-serif text-title-md break-words text-charcoal">
                    {item.productHref ? (
                        <Link href={item.productHref} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                            {item.productName}
                        </Link>
                    ) : (
                        item.productName
                    )}
                </h3>
                <p className="mt-0.5 text-caption text-stone">
                    {item.variantLabel ? `${item.variantLabel} · ${unitLine}` : unitLine}
                </p>
            </div>

            <p className="shrink-0 text-body-md font-medium text-charcoal">
                {formatCents(item.unitPriceCents * item.quantity)}
            </p>
        </li>
    );
}
