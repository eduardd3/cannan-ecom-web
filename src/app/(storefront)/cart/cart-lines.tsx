"use client";

import { useState } from "react";

import FormBanner from "@/app/components/form/form-banner";
import type { CartLineView } from "@/lib/cart/types";
import CartLine from "./cart-line";

//  The list plus the "quantity capped" banner above it. The notice comes back
//  from a line's action, so it lives here as client state. This component
//  stays mounted when revalidatePath re-renders the page, so the banner
//  survives the refresh; only the lines props change.
export default function CartLines({
    lines,
    catalogEnabled,
}: {
    lines: CartLineView[];
    catalogEnabled: boolean;
}) {
    const [capped, setCapped] = useState(false);

    return (
        <div className="flex flex-col gap-6">
            {/* Fixed copy: any notice from the action means it capped. */}
            {capped && (
                <FormBanner variant="success">We updated your quantity to what&apos;s available.</FormBanner>
            )}
            <ul className="divide-y divide-hairline">
                {lines.map((line) => (
                    <CartLine
                        key={line.itemId}
                        line={line}
                        catalogEnabled={catalogEnabled}
                        onCapped={setCapped}
                    />
                ))}
            </ul>
        </div>
    );
}
