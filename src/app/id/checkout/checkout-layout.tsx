import type { ReactNode } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

import OrderSummary, { SummaryLines, type CheckoutTotals, type SummaryLine } from "./order-summary";

type CheckoutLayoutProps = {
    heading: ReactNode;
    //  The form column below the heading: skeleton, error or the live form.
    children: ReactNode;
    lines: SummaryLine[];
    totals: CheckoutTotals | null;
};

//  Two columns from md up: the form (max 560px) and a sticky linen order
//  summary (420px). Below md the summary folds into a linen bar at the top
//  that opens in place; the form repeats the totals above Pay instead.
//
//  The same layout wraps every state, so nothing jumps when the Stripe
//  session finishes loading.
export default function CheckoutLayout({ heading, children, lines, totals }: CheckoutLayoutProps) {
    return (
        <div className="w-full">
            {/* <details> opens and closes without any JavaScript. -mx-4 px-4:
                the bar runs edge to edge, past the shell's 16px gutters. */}
            <details className="group -mx-4 bg-linen px-4 md:hidden">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-label-ui text-charcoal [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="group-open:hidden">Show order summary</span>
                        <span className="hidden group-open:inline">Hide order summary</span>
                        <ChevronDownIcon aria-hidden="true" className="size-4 text-stone transition-transform group-open:rotate-180" />
                    </span>
                    {totals && <span className="text-body-lg font-medium">{totals.total}</span>}
                </summary>
                <div className="pb-4">
                    <SummaryLines lines={lines} />
                </div>
            </details>

            <div className="pt-8 md:grid md:grid-cols-[minmax(0,35rem)_26.25rem] md:items-start md:justify-between md:gap-12 md:pt-6">
                <div>
                    {heading}
                    {children}
                </div>
                <aside className="hidden md:sticky md:top-6 md:block">
                    <OrderSummary lines={lines} totals={totals} />
                </aside>
            </div>
        </div>
    );
}
