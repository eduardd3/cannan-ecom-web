import Link from "next/link";
import type { ReactNode } from "react";

import { collectionHref, type ListingState } from "@/lib/catalog/listing";
import { pageWindow, type PageSlot } from "@/lib/catalog/pagination";

const numberClass = "flex size-11 items-center justify-center text-body-md transition-colors";

//  Below the grid when there's more than one page. Both versions render and
//  CSS shows one: desktop "← Previous 1 … 4 5 6 … 9 Next →" with 7 slots,
//  mobile "← 1 … 5 … 9 →" with 5. On the first and last page Previous/Next
//  stay in place as greyed-out spans, so the row's width never changes.
//  Every link keeps the filters and sort and lands on the grid (#pieces).
export default function PageControls({
  collectionSlug,
  filters,
  totalPages,
}: {
  collectionSlug: string;
  filters: ListingState;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const { page } = filters;
  const href = (target: number) => collectionHref(collectionSlug, { ...filters, page: target }, { hash: "pieces" });
  const previous = page > 1 ? href(page - 1) : null;
  const next = page < totalPages ? href(page + 1) : null;

  return (
    <nav aria-label="Pages" className="mt-12 md:mt-16">
      <div className="hidden items-center justify-center md:flex">
        <Step href={previous} className="mr-4">
          <span aria-hidden="true">←</span> Previous
        </Step>
        <Numbers slots={pageWindow(page, totalPages, 7)} current={page} href={href} gapClass="w-7" />
        <Step href={next} className="ml-4">
          Next <span aria-hidden="true">→</span>
        </Step>
      </div>

      <div className="flex items-center justify-center md:hidden">
        <Arrow href={previous} label="Previous page">
          ←
        </Arrow>
        <Numbers slots={pageWindow(page, totalPages, 5)} current={page} href={href} gapClass="w-6" />
        <Arrow href={next} label="Next page">
          →
        </Arrow>
      </div>
    </nav>
  );
}

function Numbers({
  slots,
  current,
  href,
  gapClass,
}: {
  slots: PageSlot[];
  current: number;
  href: (page: number) => string;
  gapClass: string;
}) {
  return slots.map((slot, index) =>
    slot === "gap" ? (
      <span key={`gap-${index}`} aria-hidden="true" className={`${gapClass} text-center text-body-md text-stone`}>
        …
      </span>
    ) : (
      <Link
        key={slot}
        href={href(slot)}
        aria-label={`Page ${slot}`}
        aria-current={slot === current ? "page" : undefined}
        className={`${numberClass} ${slot === current ? "text-charcoal underline underline-offset-4" : "text-stone hover:text-charcoal"}`}
      >
        {slot}
      </Link>
    ),
  );
}

// Desktop Previous/Next: a link, or a greyed-out span on the first/last page.
function Step({ href, className, children }: { href: string | null; className: string; children: ReactNode }) {
  const base = `flex min-h-11 items-center gap-1.5 text-label-ui ${className}`;
  return href ? (
    <Link href={href} className={`${base} text-charcoal`}>
      {children}
    </Link>
  ) : (
    <span role="link" aria-disabled="true" className={`${base} text-muted`}>
      {children}
    </span>
  );
}

// Mobile arrows: 44 × 44, or a greyed-out span on the first/last page.
function Arrow({ href, label, children }: { href: string | null; label: string; children: ReactNode }) {
  const base = "flex size-11 items-center justify-center text-title-md font-light";
  return href ? (
    <Link href={href} aria-label={label} className={`${base} text-charcoal`}>
      {children}
    </Link>
  ) : (
    <span role="link" aria-disabled="true" aria-label={label} className={`${base} text-muted`}>
      {children}
    </span>
  );
}
