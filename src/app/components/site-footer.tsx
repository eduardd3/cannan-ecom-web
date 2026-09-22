import Link from "next/link";
import Container from "@/app/components/container";

/*
Primary Color: F2F3F4
Secondary Color: 9AA1AB */

//  One array instead of three hand-copied column blocks: adding a column or a
//  link is an edit here, not a new <div> to clone and re-style. href is unique
//  per link, so it doubles as the key and the rows need no id field.
const footerColumns = [
    {
        heading: "Shop",
        links: [
            { href: "/products", label: "Products" },
            { href: "/arrivals", label: "New Arrivals" },
        ],
    },
    {
        heading: "Company",
        links: [
            { href: "/about", label: "About" },
            { href: "/contact", label: "Contact" },
            { href: "/privacy", label: "Privacy" },
        ],
    },
    {
        heading: "MyCANN",
        links: [
            { href: "/about-myCANN", label: "About" },
            { href: "/favorites", label: "Favorites" },
            { href: "/purchases", label: "Purchases" },
        ],
    },
];

export default function SiteFooter() {
    return (
        <footer className="shrink-0 rounded-t-xl border-t border-[#2A2F36] bg-[#16191E]">
            {/* Same Container as the header, so the columns stop stretching to
                the edge on a wide screen and start on the header's gutter. */}
            <Container className="py-6">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-4">
                    {footerColumns.map(({ heading, links }) => (
                        <div key={heading}>
                            <h3 className="text-lg font-bold text-[#9AA1AB]">
                                {heading}
                            </h3>
                            <ul className="mt-3 flex flex-col gap-2 text-[#F2F3F4]">
                                {links.map(({ href, label }) => (
                                    <li key={href}>
                                        <Link href={href}>{label}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-8 text-center text-[#9AA1AB] md:text-left">
                    © {new Date().getFullYear()} CANNAN LLC • California
                </div>
            </Container>
        </footer>
    );
}
