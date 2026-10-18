"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";

import FinalSaleLabel from "@/app/components/final-sale-label";
import QuantitySelect from "@/app/components/form/quantity-select";
import { removeCartItem, updateCartItemQuantity } from "@/lib/cart/actions";
import { formatCents } from "@/lib/cart/format";
import { MAX_QTY_PER_LINE } from "@/lib/cart/schemas";
import type { CartLineView } from "@/lib/cart/types";

type CartLineProps = {
    line: CartLineView;
    //  isCatalogEnabled(), from the server page: product pages 404 while the
    //  catalog is closed, so the name only links when it's open.
    catalogEnabled: boolean;
    //  Shows FinalSaleLabel under the price.
    //  TODO: pass this once products have a final-sale field in the schema.
    finalSale?: boolean;
    //  Called after each action with whether it capped the quantity, so
    //  CartLines can show or clear the banner above the list.
    onCapped: (capped: boolean) => void;
};

//  The actions revalidate the layout, so a successful change re-renders the
//  server page with fresh lines and totals (and the header badge). This
//  component only tracks the pending state and a failed action's message.
export default function CartLine({ line, catalogEnabled, finalSale, onCapped }: CartLineProps) {
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState<string | null>(null);

    const unavailable = line.availability === "unavailable";
    const maxQty = Math.max(1, Math.min(line.stock, MAX_QTY_PER_LINE));
    const productHref = line.productActive && catalogEnabled ? `/products/${line.productSlug}` : null;
    //  Dims the image, name and prices of an unavailable line; Remove stays
    //  at full strength so the way out is obvious.
    const dim = unavailable ? "opacity-60" : "";

    function setQuantity(quantity: number) {
        startTransition(async () => {
            const result = await updateCartItemQuantity({ itemId: line.itemId, quantity });
            setMessage(result.ok ? null : result.message);
            onCapped(result.ok && result.notice !== undefined);
        });
    }

    function remove() {
        startTransition(async () => {
            const result = await removeCartItem({ itemId: line.itemId });
            if (result.ok) onCapped(false);
            else setMessage(result.message);
        });
    }

    const image = line.imageUrl && (
        <Image
            src={line.imageUrl}
            alt={line.imageAlt ?? line.productName}
            fill
            sizes="(min-width: 640px) 112px, 96px"
            className="object-contain"
        />
    );
    const imageBoxClass = `relative size-24 shrink-0 overflow-hidden bg-white sm:size-28 ${dim}`;

    return (
        <li aria-busy={pending} className={`flex gap-4 py-6 first:pt-0 sm:gap-6 ${pending ? "opacity-60" : ""}`}>
            {/* The name links too, so the image link is skipped by the
                keyboard and screen readers instead of being read twice. */}
            {productHref ? (
                <Link href={productHref} tabIndex={-1} aria-hidden="true" className={imageBoxClass}>
                    {image}
                </Link>
            ) : (
                <div className={imageBoxClass}>{image}</div>
            )}

            <div className="flex min-w-0 flex-1 flex-col">
                <div className={`flex justify-between gap-4 ${dim}`}>
                    <div className="min-w-0">
                        <h2 className="font-serif text-title-md text-charcoal">
                            {productHref ? (
                                <Link href={productHref} className="underline-offset-4 hover:underline">
                                    {line.productName}
                                </Link>
                            ) : (
                                line.productName
                            )}
                        </h2>
                        {line.variantLabel && (
                            <p className="mt-1 text-caption text-stone">{line.variantLabel}</p>
                        )}
                        <p className="mt-0.5 text-caption text-stone">{formatCents(line.unitPriceCents)} each</p>
                        {finalSale && (
                            <div className="mt-1.5">
                                <FinalSaleLabel />
                            </div>
                        )}
                    </div>
                    <p className="shrink-0 text-body-md font-medium text-charcoal">
                        {formatCents(line.lineTotalCents)}
                    </p>
                </div>

                <div className="mt-4 flex items-center gap-5">
                    <QuantitySelect
                        value={line.quantity}
                        max={maxQty}
                        label={`Quantity for ${line.productName}`}
                        onChange={setQuantity}
                        disabled={pending || unavailable}
                    />
                    <button
                        type="button"
                        onClick={remove}
                        disabled={pending}
                        className="cursor-pointer text-label-ui text-stone underline underline-offset-4 transition-colors hover:text-charcoal disabled:cursor-default"
                    >
                        Remove
                    </button>
                </div>

                {line.availability === "limited" && (
                    <p className="mt-3 text-caption text-error-ink">
                        Only {line.stock} available. Lower the quantity to continue.
                    </p>
                )}
                {unavailable && (
                    <p className="mt-3 text-caption text-error-ink">
                        No longer available. Remove it to continue.
                    </p>
                )}
                {message && (
                    <p role="status" className="mt-3 text-caption text-error-ink">
                        {message}
                    </p>
                )}
            </div>
        </li>
    );
}
