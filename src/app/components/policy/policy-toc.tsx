import { ChevronDownIcon } from "@heroicons/react/24/outline";

import ActiveSectionNav from "@/app/components/policy/active-section-nav";

type Props = {
  items: { id: string; title: string }[];
};

const LABEL = "text-label-eyebrow text-stone uppercase";

//  Below lg: a native <details> above the text — no JS, keyboard and screen
//  reader support built in. Not sticky, so it never covers the text.
export function PolicyTocDisclosure({ items }: Props) {
  return (
    <details className="group mb-10 border border-hairline bg-linen/50 lg:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antique-gold [&::-webkit-details-marker]:hidden">
        <span className={LABEL}>On this page</span>
        <ChevronDownIcon
          aria-hidden="true"
          className="size-4 text-stone transition-transform group-open:rotate-180"
        />
      </summary>
      <nav aria-label="On this page" className="border-t border-hairline px-4 py-3">
        <ul className="space-y-2">
          {items.map(({ id, title }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="block py-1 text-body-md text-stone transition-colors hover:text-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antique-gold"
              >
                {title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}

//  From lg up: a sticky list beside the text. top-28 clears the 80px header.
export function PolicyTocSidebar({ items }: Props) {
  return (
    <nav aria-label="On this page" className="sticky top-28 pt-1">
      <p className={`mb-4 ${LABEL}`}>On this page</p>
      <ActiveSectionNav items={items} />
    </nav>
  );
}
