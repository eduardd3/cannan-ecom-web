import Link from "next/link";
import Container from "@/app/components/container";
import GoldRule from "@/app/components/gold-rule";

//  The one place collection slugs are hardcoded: a renamed slug is an edit
//  here. Everything else reaches collections through /products or the
//  database.
const SHOP_COLLECTIONS = [
    { slug: "signature", label: "Signature" },
    { slug: "orishas", label: "Orishas" },
    { slug: "santa-muerte", label: "Santa Muerte" },
];

//  One array instead of hand-copied column blocks: adding a link is an edit
//  here, not a new <div> to clone and re-style. href is unique per link, so it
//  doubles as the key and the rows need no id field.
//
//  Array order is grid order: one row of three from md up; below it two
//  columns, so Cannan wraps under Shop.
const footerColumns = [
    {
        heading: "Shop",
        links: SHOP_COLLECTIONS.map(({ slug, label }) => ({ href: `/collections/${slug}`, label })),
    },
    {
        heading: "Help",
        links: [
            { href: "/shipping", label: "Shipping" },
            { href: "/returns", label: "Returns & Refunds" },
            { href: "/contact", label: "Contact" },
            { href: "/orders", label: "Your orders" },
        ],
    },
    {
        heading: "About",
        links: [
            { href: "/about", label: "Cannan" },
        ],
    },
];

const legalLinks = [
    { href: "/terms", label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
];

const footerLink = "text-body-md text-stone transition-colors hover:text-charcoal";

export default function SiteFooter() {
    return (
        <footer className="shrink-0 bg-linen">
            {/* Same Container as the header, so both stop at the same max width. */}
            <Container className="flex flex-col items-center pt-12 pb-10 md:pt-16 md:pb-12">
                <span className="mb-1.5 font-serif text-wordmark text-charcoal uppercase md:mb-2">CANNAN</span>
                <p className="mb-3 text-center font-serif text-body-md text-stone italic md:mb-4">
                    For you and yours · <span lang="es">Para ti y los tuyos</span>
                </p>
                <GoldRule className="mb-8 md:mb-12" />

                {/* The columns and the bottom bar share this width, so the bar's
                    ends line up with the grid's outer edges, not the page's. */}
                <div className="w-full max-w-225">
                    <div className="mb-10 grid grid-cols-2 gap-x-4 gap-y-8 md:mb-16 md:grid-cols-3 md:gap-x-8">
                        {footerColumns.map(({ heading, links }) => (
                            <div key={heading}>
                                <h3 className="mb-2 text-label-ui text-charcoal md:mb-4">{heading}</h3>
                                <ul className="flex flex-col gap-2.5">
                                    {links.map(({ href, label }) => (
                                        <li key={href}>
                                            <Link href={href} className={footerLink}>{label}</Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    {/* flex-col-reverse: stacked below md, the legal links come
                        first; from md up, copyright left and links right. */}
                    <div className="flex flex-col-reverse items-center gap-2 text-center text-caption text-stone md:flex-row md:justify-between">
                        <p>© {new Date().getFullYear()} Cannan. All rights reserved.</p>
                        <ul className="flex items-center gap-1.5">
                            {legalLinks.map(({ href, label }, index) => (
                                <li key={href} className="flex items-center gap-1.5">
                                    {index > 0 && <span aria-hidden="true">·</span>}
                                    <Link href={href} className="transition-colors hover:text-charcoal">{label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </Container>
        </footer>
    );
}
