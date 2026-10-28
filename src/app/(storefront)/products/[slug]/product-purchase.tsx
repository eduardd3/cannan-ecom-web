"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type KeyboardEvent } from "react";

import GoldRule from "@/app/components/gold-rule";
import SelectField from "@/app/components/form/select-field";
import { buttonClass, disabledButtonClass, textLinkClass } from "@/app/components/form/styles";
import { addToCart } from "@/lib/cart/actions";
import { formatCents } from "@/lib/cart/format";
import {
  addToCartMessage,
  clampQuantity,
  galleryImages,
  optionGroups,
  productVariantPath,
  quantityOptions,
  selectOption,
  type CartMessage,
  type OptionGroup,
} from "@/lib/catalog/product-detail";
import type { ProductDetailView, ProductImageView } from "@/lib/catalog/types";

//  Gallery, option buttons, quantity, add-to-cart and Details in one
//  component, since all of them follow the selected variant. The server picks
//  the first variant from ?variant=; each change after that is written back
//  with router.replace, so the Back button still leaves in one step. Stock
//  shown here is a hint from page load: addToCart re-checks it.
export default function ProductPurchase({
  product,
  initialVariantId,
}: {
  product: ProductDetailView;
  initialVariantId: number;
}) {
  const router = useRouter();
  const { variants } = product;
  const [variantId, setVariantId] = useState(initialVariantId);
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [message, setMessage] = useState<CartMessage | null>(null);
  const [pending, startTransition] = useTransition();

  //  Falls back to the first variant if a refresh drops the selected one.
  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const soldOut = variant.stock <= 0;
  const images = galleryImages(product.images, variant.id);
  const groups = optionGroups(product, variant);

  function choose(option: 1 | 2, value: string) {
    const next = selectOption(variants, variant, option, value);
    if (next.id === variant.id) return;
    setVariantId(next.id);
    setImageIndex(0);
    setQuantity((q) => clampQuantity(q, next.stock));
    setMessage(null);
    router.replace(productVariantPath(product.slug, next.id), { scroll: false });
  }

  function add() {
    startTransition(async () => {
      const result = await addToCart({ variantId: variant.id, quantity }).catch(() => null);
      setMessage(addToCartMessage(result));
      //  The page's stock was stale: refetch it so the buy area turns to Sold out.
      if (result?.ok === false && result.error === "OUT_OF_STOCK") router.refresh();
    });
  }

  const details = [
    { term: "Material", value: product.material },
    { term: "Dimensions (H × W × D)", value: variant.dimensions },
  ].filter((row): row is { term: string; value: string } => Boolean(row.value));

  return (
    <div className="grid items-start gap-6 md:grid-cols-2 md:gap-16">
      <Gallery images={images} index={imageIndex} onSelect={setImageIndex} productName={product.name} />

      <div className="flex flex-col">
        <h1 className="font-serif text-headline-lg font-normal text-charcoal">{product.name}</h1>
        <GoldRule className="mt-2 mb-4 md:mt-3 md:mb-5" />
        <p className="text-title-md text-charcoal">{formatCents(variant.priceCents)}</p>
        {product.isFinalSale && (
          <p className="mt-2 text-caption text-stone">
            Final sale. Not eligible for change-of-mind returns.{" "}
            <Link href="/returns" className={textLinkClass}>
              Returns &amp; Refunds
            </Link>
          </p>
        )}

        {groups.length > 0 && (
          <div className="mt-6 flex flex-col gap-6">
            {groups.map((group) => (
              <OptionButtons key={group.option} group={group} onChoose={(value) => choose(group.option, value)} />
            ))}
          </div>
        )}

        <div className="mt-8">
          {/* Guests add too: addToCart starts a guest cart on the first add. */}
          {soldOut ? (
            <button type="button" disabled className={disabledButtonClass}>
              Sold out
            </button>
          ) : (
            <div className="flex items-end gap-3">
              <div className="w-24 shrink-0">
                <SelectField
                  id="quantity"
                  label="Quantity"
                  value={String(quantity)}
                  disabled={pending}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  options={quantityOptions(variant.stock).map((n) => ({ value: String(n), label: String(n) }))}
                />
              </div>
              <button type="button" onClick={add} disabled={pending} className={`flex-1 ${buttonClass()}`}>
                {pending ? "Adding…" : "Add to cart"}
              </button>
            </div>
          )}
        </div>

        {/* Always rendered, so screen readers announce the message when it appears. */}
        <div role="status">
          {message && (
            <p
              className={`mt-3 flex flex-col gap-1 border-l-2 p-3.5 text-body-md text-charcoal md:flex-row md:flex-wrap md:gap-x-2 ${
                message.tone === "error" ? "border-error-ink bg-error-tint" : "border-gold-ink bg-linen"
              }`}
            >
              <span>{message.text}</span>
              {message.viewCart && (
                <Link href="/cart" className={`self-start ${textLinkClass}`}>
                  View cart
                </Link>
              )}
            </p>
          )}
        </div>

        {details.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-label-ui text-charcoal">Details</h2>
            <dl className="text-body-md">
              {details.map(({ term, value }) => (
                <div key={term} className="flex justify-between gap-4 border-t border-hairline py-2.5 first:border-t-0">
                  <dt className="text-stone">{term}</dt>
                  <dd className="text-right text-charcoal">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <p className={`${details.length > 0 ? "mt-6" : "mt-8"} text-body-md whitespace-pre-line text-stone md:text-base`}>
          {product.description}
        </p>
      </div>
    </div>
  );
}

//  A square white tile (the product photos have white backgrounds) and
//  fixed-size thumbnails that wrap instead of stretching. No carousel.
function Gallery({
  images,
  index,
  onSelect,
  productName,
}: {
  images: ProductImageView[];
  index: number;
  onSelect: (index: number) => void;
  productName: string;
}) {
  const main = images[index] ?? images[0];
  return (
    <div className="flex flex-col">
      <div className="relative aspect-square w-full bg-white">
        {main && (
          <Image
            src={main.url}
            alt={main.alt || productName}
            fill
            priority
            sizes="(min-width: 1200px) 536px, (min-width: 768px) 50vw, 100vw"
            className="object-contain"
          />
        )}
      </div>
      {images.length > 1 && (
        <ul className="mt-2 flex flex-wrap gap-2 md:mt-4">
          {images.map((image, i) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-pressed={image === main}
                className={`relative block size-16 cursor-pointer border bg-white md:size-18 ${
                  image === main ? "border-charcoal" : "border-hairline"
                }`}
              >
                <Image src={image.url} alt="" fill sizes="72px" className="object-contain" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

//  One option as a radio group: Tab reaches the selected button, the arrow
//  keys move the selection (the standard radio-group keys). Sold-out values
//  stay selectable, so a shopper can see that size's price and details.
function OptionButtons({ group, onChoose }: { group: OptionGroup; onChoose: (value: string) => void }) {
  const labelId = `option-${group.option}-label`;
  const selectedIndex = group.values.findIndex((v) => v.selected);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const count = group.values.length;
    const next = (Math.max(selectedIndex, 0) + step + count) % count;
    onChoose(group.values[next].value);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  }

  return (
    <div>
      <p id={labelId} className="mb-2 text-label-ui text-charcoal">
        {group.name}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} onKeyDown={onKeyDown} className="flex flex-wrap gap-2">
        {group.values.map(({ value, selected, soldOut }, i) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={soldOut ? `${value}, sold out` : undefined}
            tabIndex={i === Math.max(selectedIndex, 0) ? 0 : -1}
            onClick={() => onChoose(value)}
            className={`h-12 cursor-pointer rounded-control border px-4 text-body-md transition-colors ${
              selected ? "border-charcoal" : "border-hairline hover:border-stone"
            } ${soldOut ? "text-stone line-through" : selected ? "text-charcoal" : "text-stone"}`}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
