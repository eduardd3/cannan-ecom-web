import Image from "next/image";
import Link from "next/link";

import { SummaryList, SummaryRow } from "@/app/components/summary-rows";
import { formatCents } from "@/lib/cart/format";

//  What the server hands the client about each cart line: display only.
//  Prices charged come from Stripe's session, never from these.
export type SummaryLine = {
    itemId: number;
    productName: string;
    variantLabel: string | null;
    quantity: number;
    lineTotalCents: number;
    imageUrl: string | null;
};

//  Stripe's formatted amounts. null while the session is still loading.
export type CheckoutTotals = {
    subtotal: string;
    shipping: string;
    tax: string;
    total: string;
};

//  56px image. The panel is linen, so a missing image is a gallery-white
//  square instead (a linen one would vanish into it).
function Thumb({ url, quantity }: { url: string | null; quantity: number }) {
    return (
        <div className={`relative size-14 shrink-0 ${url ? "bg-white" : "bg-gallery-white"}`}>
            {url && <Image src={url} alt="" fill sizes="56px" className="object-contain" />}
            {/* The quantity as a superscript, like the header's cart count.
                The line below says it in words for screen readers. */}
            {quantity > 1 && (
                <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 text-[11px] leading-none font-medium text-charcoal">
                    {quantity}
                </span>
            )}
        </div>
    );
}

export function SummaryLines({ lines }: { lines: SummaryLine[] }) {
    return (
        <ul className="divide-y divide-hairline">
            {lines.map((line) => (
                <li key={line.itemId} className="flex items-start gap-4 py-3.5">
                    <Thumb url={line.imageUrl} quantity={line.quantity} />
                    <div className="min-w-0 flex-1">
                        <p className="font-serif text-title-md break-words text-charcoal">{line.productName}</p>
                        <p className="mt-0.5 text-caption text-stone">
                            {line.variantLabel ? `${line.variantLabel} · ` : ""}Qty {line.quantity}
                        </p>
                    </div>
                    <p className="shrink-0 text-body-md font-medium text-charcoal">{formatCents(line.lineTotalCents)}</p>
                </li>
            ))}
        </ul>
    );
}

//  Subtotal, shipping, tax and total, all as Stripe formats them. Stripe
//  requires the page to show its live total, so these never come from the cart.
export function SummaryTotals({ totals, className = "" }: { totals: CheckoutTotals | null; className?: string }) {
    if (!totals) {
        return (
            <div aria-hidden="true" className={`flex flex-col gap-3 ${className}`}>
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-5 bg-hairline/60" />
                ))}
            </div>
        );
    }
    return (
        <SummaryList className={className}>
            <SummaryRow label="Subtotal" value={totals.subtotal} />
            <SummaryRow label="Shipping" value={totals.shipping} />
            <SummaryRow label="Tax" value={totals.tax} />
            <SummaryRow
                label="Total"
                value={<span className="text-xl">{totals.total}</span>}
                className="mt-1 items-baseline border-t border-hairline pt-4 [&>dt]:font-medium [&>dt]:text-charcoal"
            />
        </SummaryList>
    );
}

//  The desktop panel: linen, sticky beside the form.
export default function OrderSummary({ lines, totals }: { lines: SummaryLine[]; totals: CheckoutTotals | null }) {
    return (
        <section aria-labelledby="order-summary" className="bg-linen p-8">
            <div className="flex items-baseline justify-between gap-4">
                <h2 id="order-summary" className="font-serif text-headline-md font-normal text-charcoal">Your order</h2>
                <Link href="/cart" className="text-caption font-medium text-stone underline underline-offset-4 transition-colors hover:text-charcoal">
                    Edit cart
                </Link>
            </div>
            <div className="mt-4">
                <SummaryLines lines={lines} />
            </div>
            <SummaryTotals totals={totals} className="mt-5" />
        </section>
    );
}
