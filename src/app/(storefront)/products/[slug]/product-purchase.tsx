"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";

import { addToCart } from "@/lib/cart/actions";
import { formatCents } from "@/lib/cart/format";
import { MAX_QTY_PER_LINE } from "@/lib/cart/schemas";
import { formatVariantLabel } from "@/lib/catalog/format";
import type { ProductDetailView, ProductVariantView } from "@/lib/catalog/types";

//  Gallery, variant picker, quantity, and add-to-cart in one component, since
//  all four follow the selected variant. Stock shown here is a hint from page
//  load: addToCart re-checks it and returns a notice when it caps the quantity.
export default function ProductPurchase({
  product,
  signedIn,
}: {
  product: ProductDetailView;
  signedIn: boolean;
}) {
  const { variants } = product;
  //  Start on the first variant that can be bought.
  const [variantId, setVariantId] = useState(
    () => (variants.find((v) => v.stock > 0) ?? variants[0]).id,
  );
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const maxQty = Math.min(variant.stock, MAX_QTY_PER_LINE);
  const soldOut = variant.stock <= 0;

  //  The selected variant's own images first, then the ones shared by every
  //  variant. Other variants' images are left out.
  const images = [
    ...product.images.filter((image) => image.variantId === variant.id),
    ...product.images.filter((image) => image.variantId === null),
  ];
  const mainImage = images[imageIndex] ?? images[0];

  //  A product without option names has one default variant: nothing to pick.
  //  Temporary until handoff 3's picker: one button per variant, both values.
  const showPicker = product.option1Name !== null;
  const optionName = [product.option1Name, product.option2Name].filter(Boolean).join(" · ");

  function selectVariant(next: ProductVariantView) {
    setVariantId(next.id);
    setImageIndex(0);
    setQuantity((q) => Math.max(1, Math.min(q, next.stock, MAX_QTY_PER_LINE)));
    setMessage(null);
  }

  function add() {
    startTransition(async () => {
      const result = await addToCart({ variantId: variant.id, quantity });
      setMessage(
        result.ok
          ? { text: result.notice ?? "Added to your cart.", error: false }
          : { text: result.message, error: true },
      );
    });
  }

  return (
    <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-12">
      <div className="flex flex-col gap-3">
        <div className="relative aspect-square overflow-hidden rounded bg-white">
          {mainImage && (
            <Image
              src={mainImage.url}
              alt={mainImage.alt}
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-contain"  
            />
          )}
        </div>
        {images.length > 1 && ( //  Product gallery section
          <ul className="flex gap-2">
            {images.map((image, i) => (
              <li key={image.url}>
                <button
                  type="button"
                  onClick={() => setImageIndex(i)}
                  aria-label={`Show image ${i + 1}`}
                  aria-current={image === mainImage}
                  className={`relative block h-16 w-16 cursor-pointer overflow-hidden rounded border-2 ${
                    image === mainImage ? "border-[#16191E]" : "border-transparent"
                  }`}
                >
                  <Image src={image.url} alt="" fill sizes="64px" className="object-contain" 
                  /> 
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="mt-1 text-lg">{formatCents(variant.priceCents)}</p>
        </div>

        {showPicker && (
          <fieldset>
            <legend className="text-sm font-medium">{optionName}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => selectVariant(v)}
                  aria-pressed={v.id === variant.id}
                  className={`cursor-pointer rounded border px-3 py-1 text-sm ${
                    v.id === variant.id ? "border-[#16191E] bg-[#16191E] text-white" : "hover:border-[#16191E]"
                  } ${v.stock <= 0 ? "line-through opacity-60" : ""}`}
                >
                  {formatVariantLabel(v)}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {!signedIn ? (
          //  No guest carts yet, so signed-out visitors sign in first.
          <Link
            href={`/id/signin?callbackUrl=${encodeURIComponent(`/products/${product.slug}`)}`}
            className="self-start rounded bg-[#16191E] px-6 py-2 text-white"
          >
            Sign in to add to cart
          </Link>
        ) : soldOut ? (
          <span aria-disabled="true" className="self-start rounded bg-neutral-300 px-6 py-2 text-neutral-600">
            Sold out
          </span>
        ) : (
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              Qty
              <select
                value={quantity}
                disabled={pending}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="rounded border px-2 py-1"
              >
                {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={add}
              disabled={pending}
              className="cursor-pointer rounded bg-[#16191E] px-6 py-2 text-white disabled:cursor-default disabled:opacity-60"
            >
              {pending ? "Adding…" : "Add to cart"}
            </button>
          </div>
        )}

        {message && (
          <p role="status" className={`text-sm ${message.error ? "text-red-700" : "text-neutral-700"}`}>
            {message.text}{" "}
            {!message.error && (
              <Link href="/cart" className="underline underline-offset-2">
                View cart
              </Link>
            )}
          </p>
        )}

        <p className="whitespace-pre-line text-neutral-800">{product.description}</p>
      </div>
    </div>
  );
}
