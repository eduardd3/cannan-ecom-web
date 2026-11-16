import Link from "next/link";

import { textLinkClass } from "@/app/components/form/styles";

// One filter or sort link, with its URL already built.
export type OptionLink = { key: string; label: string; href: string; active: boolean };

// How many options show before the rest fold under "Show all" ("All" counts).
const FOLD_AFTER = 8;

export function optionLinkClass(active: boolean) {
  return `text-body-md transition-colors ${active ? "text-charcoal underline underline-offset-4" : "text-stone hover:text-charcoal"}`;
}

//  A list of filter or sort links: the desktop sidebar's spaced list, or the
//  mobile rows' 44px rows. Past 8 options the rest fold into a <details>
//  ("Show all" / "Show fewer", swapped by CSS on [open], no JS). It renders
//  open when the selected option is one of the folded ones, so the active
//  filter is never hidden.
export default function OptionLinks({
  options,
  variant,
  labelledBy,
}: {
  options: OptionLink[];
  variant: "sidebar" | "row";
  labelledBy?: string;
}) {
  const shown = options.slice(0, FOLD_AFTER);
  const folded = options.slice(FOLD_AFTER);
  const listClass = variant === "sidebar" ? "flex flex-col gap-2" : "flex flex-col";
  const linkClass = (active: boolean) =>
    variant === "sidebar" ? optionLinkClass(active) : `flex min-h-11 items-center ${optionLinkClass(active)}`;

  const items = (list: OptionLink[]) =>
    list.map((option) => (
      <li key={option.key}>
        <Link href={option.href} aria-current={option.active ? "true" : undefined} className={linkClass(option.active)}>
          {option.label}
        </Link>
      </li>
    ));

  return (
    <>
      <ul aria-labelledby={labelledBy} className={listClass}>
        {items(shown)}
      </ul>
      {folded.length > 0 && (
        <details open={folded.some((option) => option.active)} className="group/fold">
          <summary
            className={`list-none text-label-ui ${textLinkClass} [&::-webkit-details-marker]:hidden ${
              variant === "sidebar" ? "mt-3" : "flex min-h-11 items-center"
            }`}
          >
            <span className="group-open/fold:hidden">Show all</span>
            <span className="hidden group-open/fold:inline">Show fewer</span>
          </summary>
          <ul aria-labelledby={labelledBy} className={`${listClass} ${variant === "sidebar" ? "mt-2" : ""}`}>
            {items(folded)}
          </ul>
        </details>
      )}
    </>
  );
}
