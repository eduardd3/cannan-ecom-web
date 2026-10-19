import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import Container from "@/app/components/container";
import { textLinkClass } from "@/app/components/form/styles";
import GoldRule from "@/app/components/gold-rule";
import HelpLine from "@/app/components/help-line";
import { SummaryList, SummaryRow } from "@/app/components/summary-rows";
import { formatCents } from "@/lib/cart/format";
import { getCurrentUserId } from "@/lib/cart/session";
import { getCustomerOrder, type CustomerOrder } from "@/lib/orders/customer-queries";
import { addressLines, formatOrderDay, parseOrderId } from "@/lib/orders/format";
import { CARRIER_LABEL, trackingUrl } from "@/lib/orders/shipping";
import OrderLine from "../order-line";
import OrderStatusLabel from "../order-status-label";

export async function generateMetadata({ params }: PageProps<"/purchases/[id]">): Promise<Metadata> {
    const { id } = await params;
    return { title: `Order #${id} | Cannan`, robots: { index: false } };
}

const sectionHeadingClass = "font-serif text-headline-md font-normal text-charcoal";

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
        <Container className="py-10 md:py-16">
            {/* Same 760px column as the orders list. */}
            <div className="mx-auto max-w-190">
                {/* Underlined on hover only, unlike textLinkClass: it's navigation, not a link in a sentence. */}
                <Link
                    href="/purchases"
                    className="text-caption text-gold-ink underline-offset-4 transition-colors hover:text-charcoal hover:underline"
                >
                    ← Your orders
                </Link>
                <h1 className="mt-4 font-serif text-headline-lg text-charcoal">Order #{order.id}</h1>
                <p className="mt-1.5 text-caption text-stone">
                    Placed {formatOrderDay(order.createdAt)} · <OrderStatusLabel status={order.status} />
                </p>
                <GoldRule className="my-6" />

                <StatusNote order={order} />

                <section aria-labelledby="items-heading" className="mt-12">
                    <h2 id="items-heading" className={`${sectionHeadingClass} mb-6`}>
                        Items
                    </h2>
                    <ul className="divide-y divide-hairline">
                        {order.items.map((item) => (
                            <OrderLine key={item.id} item={item} />
                        ))}
                    </ul>
                </section>

                <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-16">
                    {address.length > 0 && (
                        <section aria-labelledby="address-heading">
                            <h2 id="address-heading" className={`${sectionHeadingClass} mb-4`}>
                                Shipping address
                            </h2>
                            <address className="text-body-md text-stone not-italic">
                                {address.map((line, i) => (
                                    <p key={i} className={i === 0 ? "font-medium text-charcoal" : undefined}>
                                        {line}
                                    </p>
                                ))}
                            </address>
                        </section>
                    )}

                    {/* What was charged, whatever the status: a canceled or
                        refunded order still shows its totals. */}
                    <section aria-labelledby="summary-heading">
                        <h2 id="summary-heading" className={`${sectionHeadingClass} mb-4`}>
                            Order summary
                        </h2>
                        <SummaryList>
                            <SummaryRow label="Subtotal" value={formatCents(order.subtotalCents)} />
                            <SummaryRow
                                label="Shipping"
                                value={order.shippingCents === 0 ? "Free" : formatCents(order.shippingCents)}
                            />
                            <SummaryRow label="Tax" value={formatCents(order.taxCents)} />
                            <SummaryRow
                                label="Total"
                                value={formatCents(order.totalCents)}
                                className="border-t border-hairline pt-3"
                            />
                            {order.refundedCents > 0 && (
                                <SummaryRow
                                    label="Refunded"
                                    value={<span className="text-stone">−{formatCents(order.refundedCents)}</span>}
                                />
                            )}
                        </SummaryList>
                    </section>
                </div>

                <HelpLine lead="Need help with this order?" className="mt-12" />
            </div>
        </Container>
    );
}

//  Linen panel under the heading. The switch covers every status, so a new
//  one won't compile until it has a note. NEEDS_REVIEW reads as PAID.
function StatusNote({ order }: { order: CustomerOrder }) {
    let note: ReactNode;
    let ruleClass = "border-gold-ink";

    switch (order.status) {
        case "PAID":
        case "NEEDS_REVIEW":
            note = "We're preparing your order. It ships within 1 business day.";
            break;
        case "FULFILLED":
            note = <ShippedNote shipment={order.shipment} />;
            break;
        case "REFUNDED":
            note = "This order was refunded. Refunds can take several business days to appear on your statement.";
            ruleClass = "border-hairline";
            break;
        case "CANCELED":
            note = "This order was canceled.";
            ruleClass = "border-hairline";
            break;
        default: {
            const unhandled: never = order.status;
            throw new Error(`No status note for ${String(unhandled)}`);
        }
    }

    const partialRefund = order.refundedCents > 0 && order.status !== "REFUNDED";

    return (
        <div className={`border-l-2 bg-linen px-5 py-4 text-body-md text-charcoal ${ruleClass}`}>
            <p>{note}</p>
            {partialRefund && (
                <p className="mt-1.5 text-stone">A partial refund of {formatCents(order.refundedCents)} was issued.</p>
            )}
        </div>
    );
}

function ShippedNote({ shipment }: { shipment: CustomerOrder["shipment"] }) {
    //  The query returns a shipment only when carrier and tracking are both set.
    if (!shipment) return "Your order has shipped.";

    const href = trackingUrl(shipment.carrier, shipment.trackingNumber);
    const lead =
        shipment.carrier === "OTHER" ? "Your order has shipped." : `Shipped with ${CARRIER_LABEL[shipment.carrier]}.`;

    return (
        <>
            {lead} Tracking <span className="break-all">{shipment.trackingNumber}</span>
            {href && (
                <>
                    {" "}
                    <a href={href} target="_blank" rel="noopener noreferrer" className={textLinkClass}>
                        Track package<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                </>
            )}
        </>
    );
}
