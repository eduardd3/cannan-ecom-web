import { ChevronDownIcon } from "@heroicons/react/24/outline";

import OptionLinks, { type OptionLink } from "./option-links";

export type MobileRow = {
  key: string; // "type", "facet" or "sort"
  label: string; // "Type", the facet label (e.g. "Devotion"), or "Sort by"
  value: string; // the current choice's name
  chosen: boolean; // false for "All" and Featured, which show in stone
  options: OptionLink[];
};

//  The mobile filters and sort (below md): one <details> row per group, each
//  opening to the same links as desktop. Plain links, so no JS is needed.
//  Hairlines go between rows only: none above the first or below the last.
export default function MobileRows({ rows }: { rows: MobileRow[] }) {
  return (
    <div className="mb-6 divide-y divide-hairline md:hidden">
      {rows.map((row) => {
        return (
          <details key={`${row.key}-${row.value}`} className="group/row">
            <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
              <span className="text-label-ui text-charcoal">{row.label}</span>
              <span className="flex min-w-0 items-center gap-2">
                <span className={`truncate text-body-md ${row.chosen ? "text-charcoal" : "text-stone"}`}>{row.value}</span>
                <ChevronDownIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-charcoal transition-transform group-open/row:rotate-180"
                />
              </span>
            </summary>
            <div className="pb-3">
              <OptionLinks options={row.options} variant="row" />
            </div>
          </details>
        );
      })}
    </div>
  );
}
