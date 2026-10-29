import Link from "next/link";
import Container from "@/app/components/container";
import GoldRule from "@/app/components/gold-rule";
import { listCollections } from "@/lib/catalog/queries";

type FooterLink = { href: string; label: string };

//  Every collection, from the database, with the same hrefs as the homepage
//  grid: /products (Opening soon) until a collection has something in it.
async function shopLinks(): Promise<FooterLink[]> {
    return (await listCollections()).map(({ href, name }) => ({ href, label: name }));
}

//  One array instead of hand-copied column blocks: adding a link is an edit
//  here, not a new <div> to clone and re-style. label is unique within a
//  column, so it doubles as the key (href isn't: empty collections all link
//  to /products).
//
//  Two columns at every width. About moved to the header nav, which is why
//  there's no "Cannan" column.
//
//  serif: the collections are set like product names (EB Garamond, charcoal),
//  as the rooms of the gallery; help links stay plain DM Sans.
const footerColumns = (shop: FooterLink[]) => [
    {
        heading: "Shop",
        serif: true,
        links: shop,
    },
    {
        heading: "Help",
        serif: false,
        links: [
            { href: "/shipping", label: "Shipping" },
            { href: "/returns", label: "Returns & Refunds" },
            { href: "/contact", label: "Contact" },
            { href: "/orders", label: "Your orders" },
        ],
    },
];

const legalLinks = [
    { href: "/terms", label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
];

//  Below md each link is a 44px row (min-h-11) for thumbs; from md up the
//  list's gap does the spacing instead.
const linkBase = "flex min-h-11 items-center transition-colors md:min-h-0";
const serifLink = `${linkBase} font-serif text-title-md text-charcoal hover:underline underline-offset-4 decoration-1`;
const plainLink = `${linkBase} text-body-md text-stone hover:text-charcoal`;

//  "Wall label" layout: the brand block sits left, starting on the same line
//  as the header's wordmark, and the columns end on the same line as the
//  header's icons. Both come from Container, so header and footer frame every
//  page from the same two edges.
export default async function SiteFooter() {
    const columns = footerColumns(await shopLinks());
    return (
        <footer className="shrink-0 bg-linen">
            <Container className="pt-12 pb-10 md:pt-22 md:pb-9">
                <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
                    <div>
                        <span className="font-serif text-wordmark text-charcoal uppercase">CANNAN</span>
                        {/* Two lines, English over Spanish, instead of one line
                            joined by "·": they read as a pair, and nothing
                            dangles when it wraps on a phone. */}
                        <p className="mt-2.5 font-serif text-body-lg text-stone italic">
                            For you and yours
                            <br />
                            <span lang="es">Para ti y los tuyos</span>
                        </p>
                        <GoldRule className="mt-5 md:mt-6" />
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 md:grid-cols-[repeat(2,max-content)] md:gap-x-30">
                        {columns.map(({ heading, serif, links }) => (
                            <div key={heading}>
                                <h3 className="mb-1 text-label-ui text-charcoal md:mb-4">{heading}</h3>
                                <ul className={`flex flex-col ${serif ? "md:gap-2" : "md:gap-3"}`}>
                                    {links.map(({ href, label }) => (
                                        <li key={label}>
                                            <Link href={href} className={serif ? serifLink : plainLink}>{label}</Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Full Container width, so its ends line up with the brand
                    block and the columns above. flex-col-reverse: stacked below
                    md, the legal links come first; from md up, copyright left
                    and links right. */}
                <div className="mt-12 flex flex-col-reverse items-start gap-1 text-caption text-stone md:mt-28 md:flex-row md:items-center md:justify-between">
                    <p>© {new Date().getFullYear()} Cannan. All rights reserved.</p>
                    <ul className="flex items-center gap-1.5">
                        {legalLinks.map(({ href, label }, index) => (
                            <li key={href} className="flex items-center gap-1.5">
                                {index > 0 && <span aria-hidden="true">·</span>}
                                <Link href={href} className="flex min-h-11 items-center transition-colors hover:text-charcoal md:min-h-0">
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </Container>
        </footer>
    );
}
