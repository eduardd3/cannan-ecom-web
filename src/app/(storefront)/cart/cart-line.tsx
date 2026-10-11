"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";

import { removeCartItem, updateCartItemQuantity } from "@/lib/cart/actions";
import { formatCents } from "@/lib/cart/format";
import { MAX_QTY_PER_LINE } from "@/lib/cart/schemas";
import type { CartLineView } from "@/lib/cart/types";

//  The actions revalidate the layout, so a successful change re-renders the
//  server page with fresh lines and totals (and the header badge). This component only tracks the
//  pending state and the message from the last action.
export default function CartLine({ line }: { line: CartLineView }) {
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState<string | null>(null);

    const unavailable = line.availability === "unavailable";
    const maxQty = Math.max(1, Math.min(line.stock, MAX_QTY_PER_LINE));
    const productHref = `/products/${line.productSlug}`;

    function setQuantity(quantity: number) {
        startTransition(async () => {
            const result = await updateCartItemQuantity({ itemId: line.itemId, quantity });
            setMessage(result.ok ? (result.notice ?? null) : result.message);
        });
    }

    function remove() {
        startTransition(async () => {
            const result = await removeCartItem({ itemId: line.itemId });
            if (!result.ok) setMessage(result.message);
        });
    }

    return (
        <li className={`flex gap-4 py-6 ${pending ? "opacity-60" : ""}`}>
            {/* Links 404 for a line whose product went draft/archived; it's
                already marked unavailable below, so that's accurate. */}
            <Link href={productHref} className="relative h-24 w-24 shrink-0 overflow-hidden rounded bg-white">
                {line.imageUrl && (
                    <Image
                        src={line.imageUrl}
                        alt={line.imageAlt ?? line.productName}
                        fill
                        sizes="96px"
                        className="object-contain"
                    />
                )}
            </Link>

            <div className="flex flex-1 flex-col gap-1">
                <div className="flex justify-between gap-4">
                    <div>
                        <Link href={productHref} className="font-medium underline-offset-2 hover:underline">
                            {line.productName}
                        </Link>
                        {line.variantLabel && (
                            <p className="text-sm text-neutral-600">{line.variantLabel}</p>
                        )}
                        <p className="text-sm text-neutral-600">{formatCents(line.unitPriceCents)} each</p>
                    </div>
                    <p className="font-medium">{formatCents(line.lineTotalCents)}</p>
                </div>

                {line.availability === "limited" && (
                    <p className="text-sm text-amber-700">
                        Only {line.stock} left. Lower the quantity to check out.
                    </p>
                )}
                {unavailable && (
                    <p className="text-sm text-red-700">
                        No longer available. Remove it to check out.
                    </p>
                )}

                <div className="mt-2 flex items-center gap-4">
                    {!unavailable && (
                        <label className="flex items-center gap-2 text-sm">
                            Qty
                            <select
                                value={line.quantity}
                                disabled={pending}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="rounded border px-2 py-1"
                            >
                                {/* Keep the current quantity selectable even when it's
                                    over stock ("limited"), so the select shows the truth. */}
                                {Array.from({ length: Math.max(maxQty, line.quantity) }, (_, i) => i + 1).map((n) => (
                                    <option key={n} value={n} disabled={n > maxQty}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                    <button
                        type="button"
                        onClick={remove}
                        disabled={pending}
                        className="cursor-pointer text-sm underline-offset-2 hover:underline disabled:cursor-default"
                    >
                        Remove
                    </button>
                </div>

                {message && (
                    <p role="status" className="text-sm text-neutral-700">
                        {message}
                    </p>
                )}
            </div>
        </li>
    );
}
