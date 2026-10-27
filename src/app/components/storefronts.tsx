import { textLinkClass } from "@/app/components/form/styles";

//  Cannan's marketplace storefronts, as plain text links: the design system
//  allows no brand logos or badges. External, so a plain <a> in a new tab
//  rather than next/link.
const storeLinks = [
    { href: "https://www.amazon.com/s?me=A17J8ESNV6NKND&marketplaceID=ATVPDKIKX0DER", label: "Amazon" },
    { href: "https://www.walmart.com/seller/102911568", label: "Walmart" },
];

export default function Storefronts() {
    return (
        <ul className="flex gap-6">
            {storeLinks.map(({ href, label }) => (
                <li key={label}>
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex min-h-11 items-center text-label-ui ${textLinkClass}`}
                    >
                        {label}
                    </a>
                </li>
            ))}
        </ul>
    );
}
