import Link from "next/link";
import Container from "@/app/components/container";
import GoldRule from "@/app/components/gold-rule";
import Storefronts from "@/app/components/storefronts";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

//  One array instead of hand-copied column blocks: adding a column or a link
//  is an edit here, not a new <div> to clone and re-style. href is unique per
//  link, so it doubles as the key and the rows need no id field.
//
//  Only routes that exist are linked.
//  TODO: link the Signature / Orishas / Santa Muerte collections under Shop
//  once there's a collection page or filter to point them at.
//  TODO(4.7): pages not built yet: Artisans, Sourcing, How we choose.
const footerColumns = [
    {
        heading: "Shop",
        links: [
            { href: "/products", label: "All products" },
        ],
    },
    {
        heading: "Cannan",
        links: [
            { href: "/about", label: "About" },
            { href: "/contact", label: "Contact" },
        ],
    },
    {
        heading: "Help",
        links: [
            { href: "/shipping", label: "Shipping" },
            { href: "/returns", label: "Returns & Refunds" },
            { href: "/purchases", label: "Your orders" },
        ],
    },
];

const eyebrow = "text-label-eyebrow uppercase";
const footerLink = "text-body-md text-stone transition-colors hover:text-charcoal";

export default function SiteFooter() {
    return (
        <footer className="shrink-0 border-t border-hairline bg-linen">
            {/* Same Container as the header, so the columns start on the
                header's gutter and stop at the same max width. */}
            <Container className="pt-16 pb-12">
                <div className="mb-16 flex flex-col items-center text-center">
                    <span className="mb-2 font-serif text-wordmark text-charcoal uppercase">CANNAN</span>
                    <p className={`mb-4 text-gold-ink ${eyebrow}`}>Since 2022</p>
                    <GoldRule className="mb-4" />
                    <p className="text-body-md text-stone italic">
                        For you and yours · <span lang="es">Para ti y los tuyos</span>
                    </p>
                </div>

                <div className="mb-12 grid grid-cols-1 gap-8 border-t border-hairline pt-12 sm:grid-cols-2 md:grid-cols-4">
                    {footerColumns.map(({ heading, links }) => (
                        <div key={heading} className="flex flex-col gap-3">
                            <h3 className={`text-charcoal ${eyebrow}`}>{heading}</h3>
                            <ul className="flex flex-col gap-2.5">
                                {links.map(({ href, label }) => (
                                    <li key={href}>
                                        <Link href={href} className={footerLink}>{label}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    <div className="flex flex-col gap-3">
                        <h3 className={`text-charcoal ${eyebrow}`}>Also find us on</h3>
                        <div className="text-stone [&_a]:transition-colors [&_a:hover]:text-charcoal">
                            <Storefronts />
                        </div>
                        <a href={SUPPORT_MAILTO} className={`mt-2 ${footerLink}`}>{SUPPORT_EMAIL}</a>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-between gap-4 border-t border-hairline pt-6 md:flex-row">
                    <p className="text-caption text-stone">
                        © {new Date().getFullYear()} Cannan. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link href="/terms" className="text-caption text-stone transition-colors hover:text-charcoal">Terms of Service</Link>
                        <Link href="/privacy" className="text-caption text-stone transition-colors hover:text-charcoal">Privacy Policy</Link>
                    </div>
                </div>
            </Container>
        </footer>
    );
}
