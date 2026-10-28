"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { formatCents } from "@/lib/cart/format";
import type { ProductCardView } from "@/lib/catalog/types";

//  "01", "02"… for the catalogue numbers and the counter.
const pad = (n: number) => String(n).padStart(2, "0");

type RailState = {
  first: number; //  1-based index of the first piece in view
  last: number; //  1-based index of the last piece in view
  atStart: boolean;
  atEnd: boolean;
  //  The gold segment: where it starts and how wide it is, in % of the track.
  thumbLeft: number;
  thumbWidth: number;
};

//  A "gallery rail": native horizontal scrolling with snap points, so phones
//  get a normal swipe and nothing here fights the browser. JavaScript only adds
//  the desktop arrows, the counter, and the gold progress line. No autoplay.
export default function FeaturedRail({ products, heading }: { products: ProductCardView[]; heading: ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RailState>({
    first: 1,
    last: Math.min(4, products.length),
    atStart: true,
    atEnd: products.length <= 4,
    thumbLeft: 0,
    thumbWidth: 100,
  });

  //  Reads the scroll position and works out which pieces are in view (a
  //  piece counts once its middle is on screen).
  const measure = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const { scrollLeft, clientWidth, scrollWidth } = scroller;
    const pieces = Array.from(scroller.querySelectorAll<HTMLElement>("[data-piece]"));
    const inView = pieces
      .map((el, i) => ({ i, middle: el.offsetLeft + el.offsetWidth / 2 }))
      .filter(({ middle }) => middle >= scrollLeft && middle <= scrollLeft + clientWidth)
      .map(({ i }) => i + 1);

    setState({
      first: inView[0] ?? 1,
      last: inView[inView.length - 1] ?? 1,
      atStart: scrollLeft <= 1,
      atEnd: scrollLeft + clientWidth >= scrollWidth - 1,
      thumbLeft: (scrollLeft / scrollWidth) * 100,
      thumbWidth: (clientWidth / scrollWidth) * 100,
    });
  }, []);

  //  Measure on mount and whenever the rail resizes (rotation, window resize).
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [measure]);

  //  Scroll events fire many times per frame; one measure per frame is enough.
  const frame = useRef<number | null>(null);
  const onScroll = () => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      measure();
    });
  };

  //  One "page" is the visible width, so an arrow moves four pieces on
  //  desktop; snap points line them up. Instant for reduced-motion users.
  const page = (direction: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollBy({ left: direction * scroller.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };

  //  The end card is the ninth "piece" in the rail; the counter stops at 08.
  const total = pad(products.length);
  const arrow =
    "flex size-11 cursor-pointer items-center justify-center text-[1.375rem] font-light text-charcoal transition-colors hover:text-gold-ink disabled:cursor-default disabled:text-hairline";

  return (
    <>
      <div className="flex items-end justify-between gap-8">
        {heading}
        {/* Arrows and counter: desktop only. Phones swipe. */}
        <div className="hidden shrink-0 items-center md:flex">
          <span aria-hidden="true" className="mr-3 text-label-eyebrow text-gold-ink">
            <span className="text-charcoal">
              {pad(Math.min(state.first, products.length))}–{pad(Math.min(state.last, products.length))}
            </span>{" "}
            / {total}
          </span>
          <button type="button" aria-label="Previous pieces" disabled={state.atStart} onClick={() => page(-1)} className={arrow}>
            ←
          </button>
          <button type="button" aria-label="Next pieces" disabled={state.atEnd} onClick={() => page(1)} className={`-mr-3 ${arrow}`}>
            →
          </button>
        </div>
      </div>

      {/* A focusable, labelled region, so keyboard users can scroll it with
          the arrow keys. The scrollbar is hidden; the gold line replaces it.
          Below md it runs edge to edge (-mx-4) and the next card peeks in. */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        role="region"
        aria-label="Featured pieces"
        tabIndex={0}
        className="-mx-4 mt-9 snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:mt-12 md:scroll-px-0 md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        <ul className="relative flex gap-4 md:gap-6">
          {products.map((product, i) => (
            <li key={product.slug} data-piece className="shrink-0 basis-[62%] snap-start md:basis-[calc((100%-4.5rem)/4)]">
              <FeaturedCard product={product} number={i + 1} />
            </li>
          ))}
          <li data-piece className="shrink-0 basis-[62%] snap-start md:basis-[calc((100%-4.5rem)/4)]">
            <EndCard />
          </li>
        </ul>
      </div>

      {/* The progress line: a hairline track with a gold segment the width
          of what's in view, sliding as you browse. The same gold line that
          sits under every page heading. */}
      <div aria-hidden="true" className="mt-9 flex items-center gap-4 md:mt-12">
        <div className="relative h-px flex-1 bg-hairline">
          <div
            className="absolute top-0 h-px bg-antique-gold"
            style={{ left: `${state.thumbLeft}%`, width: `${state.thumbWidth}%` }}
          />
        </div>
        <span className="text-label-eyebrow text-gold-ink md:hidden">
          <span className="text-charcoal">{pad(Math.min(state.first, products.length))}</span> / {total}
        </span>
      </div>
    </>
  );
}

//  Same data and price format as the /products cards. The name is in Garamond
//  like every product name; "Sold out" sits in the price line, not on the
//  image (no badges on images).
function FeaturedCard({ product, number }: { product: ProductCardView; number: number }) {
  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col">
      <div className="relative aspect-4/5 w-full overflow-hidden bg-white">
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            fill
            sizes="(min-width: 1200px) 282px, (min-width: 768px) 25vw, 62vw"
            className="object-contain transition-transform duration-500 ease-out group-hover:scale-105"
          />
        )}
      </div>
      {/* A catalogue number, like a piece in an exhibition. Decorative. */}
      <p aria-hidden="true" className="mt-4 text-[0.6875rem] leading-none font-medium tracking-[0.16em] text-gold-ink">
        NO. {pad(number)}
      </p>
      <p className="mt-2 font-serif text-title-md break-words text-charcoal underline-offset-4 group-hover:underline">
        {product.name}
      </p>
      <p className="mt-1 text-body-md text-stone">
        {!product.inStock && (
          <>
            <span className="font-medium text-charcoal">Sold out</span> ·{" "}
          </>
        )}
        {product.hasPriceRange ? "From " : ""}
        {formatCents(product.minPriceCents)}
      </p>
    </Link>
  );
}

//  After the last piece: hand people on to browsing instead of a dead end.
//  TODO(copy).
function EndCard() {
  return (
    <Link
      href="/#collections"
      className="group flex aspect-4/5 w-full flex-col items-center justify-center bg-linen p-6 text-center"
    >
      <span aria-hidden="true" className="h-px w-12 bg-antique-gold" />
      <span className="mt-5 font-serif text-[1.625rem] leading-tight text-charcoal italic md:text-3xl">
        See every piece
        <br />
        in its collection
      </span>
      <span className="mt-5 inline-flex items-center gap-1.5 text-label-ui text-gold-ink transition-colors group-hover:text-charcoal">
        <span className="underline underline-offset-4">The collections</span>
        <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">
          →
        </span>
      </span>
    </Link>
  );
}
