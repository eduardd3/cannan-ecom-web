"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import ButtonLink from "@/app/components/form/button-link";
import { stateBodyClass, textLinkClass } from "@/app/components/form/styles";
import PageHeading from "@/app/components/page-heading";
import { SummaryList, SummaryRow } from "@/app/components/summary-rows";

type ReturnStatusProps = {
    eyebrow?: string;
    title: string;
    body: string;
    //  Already formatted on the server. Each row renders only if Stripe had
    //  the value. Never an order number: the webhook may not have made the
    //  order yet.
    details?: { total?: string; email?: string };
    primary: { label: string; href: string };
    //  "Need help? Contact us" under the actions (the not-found state).
    showContact?: boolean;
};

//  One result of the checkout return page. The server page picks the state
//  and checks ownership; this only renders it, and moves focus to the <h1>
//  on load so screen readers announce the result.
export default function ReturnStatus({ eyebrow, title, body, details, primary, showContact }: ReturnStatusProps) {
    const titleRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        titleRef.current?.focus();
    }, []);

    const hasDetails = details && (details.total !== undefined || details.email !== undefined);

    return (
        <div className="w-full max-w-100 text-center">
            <PageHeading eyebrow={eyebrow} title={title} titleRef={titleRef} />
            <p className={stateBodyClass}>{body}</p>

            {hasDetails && (
                <div className="mb-8 rounded-[2px] bg-linen p-6 text-left">
                    <SummaryList>
                        {details.total !== undefined && <SummaryRow label="Total" value={details.total} />}
                        {details.email !== undefined && <SummaryRow label="Email" value={details.email} />}
                    </SummaryList>
                </div>
            )}

            <div className="flex flex-col items-center gap-3">
                <ButtonLink href={primary.href}>{primary.label}</ButtonLink>
                <Link href="/products" className={`${textLinkClass} py-2 text-body-md`}>
                    Continue shopping
                </Link>
            </div>

            {showContact && (
                <p className="mt-6 text-body-md text-stone">
                    Need help?{" "}
                    <Link href="/contact" className={textLinkClass}>
                        Contact us
                    </Link>
                </p>
            )}
        </div>
    );
}
