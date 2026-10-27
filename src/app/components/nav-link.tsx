"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLinkProps = {
    href: string;
    label: string;
    //  Path prefixes that count as this link's section, e.g. Shop is active on
    //  /collections/* and /products/*.
    section: string[];
};

//  A header nav link that knows when you're in its section. A client component
//  only because the pathname lives on the client; the rest of the header stays
//  a Server Component.
export default function NavLink({ href, label, section }: NavLinkProps) {
    const pathname = usePathname();
    const inSection = section.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    //  "page" only on the link's own page; "true" marks the section around it
    //  (a product page is in Shop, but isn't the Shop page).
    const current = pathname === href ? "page" : inSection ? "true" : undefined;

    return (
        //  -mx-2 px-2: the padding widens the tap area to 44px without
        //  shifting the text.
        <Link
            href={href}
            aria-current={current}
            className={`-mx-2 flex h-11 items-center px-2 text-label-ui transition-colors ${
                inSection ? "text-charcoal" : "text-stone hover:text-charcoal"
            }`}
        >
            <span className="relative">
                {label}
                {/* The active mark: a 1px antique-gold line, the same gold as
                    the rule under every page heading. Decorative; aria-current
                    carries the meaning. */}
                {inSection && (
                    <span aria-hidden="true" className="absolute inset-x-0 -bottom-1.5 h-px bg-antique-gold" />
                )}
            </span>
        </Link>
    );
}
