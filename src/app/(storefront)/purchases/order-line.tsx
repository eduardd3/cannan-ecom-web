import Image from "next/image";
import Link from "next/link";

import { formatCents } from "@/lib/cart/format";
import type { CustomerOrderItem } from "@/lib/orders/customer-queries";

//  One item of a past order, on the order page.
export default function OrderLine({ item }: { item: CustomerOrderItem }) {
    const image = (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-white">
            {item.imageUrl && (
                <Image
                    src={item.imageUrl}
                    alt={item.imageAlt ?? item.productName}
                    fill
                    sizes="80px"
                    className="object-contain"
                />
            )}
        </div>
    );

    return (
        <li className="flex gap-4 py-5">
            {item.productHref ? <Link href={item.productHref}>{image}</Link> : image}

            <div className="flex flex-1 justify-between gap-4">
                <div>
                    {item.productHref ? (
                        <Link href={item.productHref} className="font-medium underline-offset-2 hover:underline">
                            {item.productName}
                        </Link>
                    ) : (
                        <p className="font-medium">{item.productName}</p>
                    )}
                    {item.variantLabel && <p className="text-sm text-neutral-600">{item.variantLabel}</p>}
                    <p className="text-sm text-neutral-600">
                        {item.quantity} × {formatCents(item.unitPriceCents)}
                    </p>
                </div>
                <p className="font-medium">{formatCents(item.unitPriceCents * item.quantity)}</p>
            </div>
        </li>
    );
}
