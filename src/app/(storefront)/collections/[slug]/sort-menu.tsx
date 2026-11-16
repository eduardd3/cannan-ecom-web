"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { optionLinkClass, type OptionLink } from "./option-links";

//  The desktop "Sort by" disclosure at the right of the count row. A plain
//  <details>, so without JS it still opens and closes from its summary and
//  its links work. With JS it also closes on a click or tap outside, and on
//  Escape, which returns focus to the summary.
export default function SortMenu({
  currentLabel,
  isDefault,
  options,
}: {
  currentLabel: string;
  isDefault: boolean; // Featured: shown in stone, like "All"
  options: OptionLink[];
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const details = detailsRef.current;
      if (details?.open && !details.contains(event.target as Node)) details.open = false;
    }
    function onKeyDown(event: KeyboardEvent) {
      const details = detailsRef.current;
      if (event.key !== "Escape" || !details?.open) return;
      details.open = false;
      summaryRef.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    // TODO(Lalo): L7
    <details ref={detailsRef} className="group/sort relative">
      <summary
        ref={summaryRef}
        className="flex min-h-11 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden"
      >
        <span className="text-label-ui text-charcoal">Sort by</span>
        <span className={`text-body-md ${isDefault ? "text-stone" : "text-charcoal"}`}>{currentLabel}</span>
        <ChevronDownIcon aria-hidden="true" className="size-4 text-charcoal transition-transform group-open/sort:rotate-180" />
      </summary>
      <ul className="absolute top-full right-0 z-10 w-58 border border-hairline bg-gallery-white px-4 py-2">
        {options.map((option) => (
          <li key={option.key}>
            <Link
              href={option.href}
              aria-current={option.active ? "true" : undefined}
              className={`flex min-h-10 items-center ${optionLinkClass(option.active)}`}
            >
              {option.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
