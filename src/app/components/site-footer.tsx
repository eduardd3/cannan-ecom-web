import Link from "next/link";

/* 
Primary Color: F2F3F4
Secondary Color: 9AA1AB */
export default function SiteFooter() { 
    const footLinksCol1 = [
    { href: "/products", label: "Products"},
    { href: "/arrivals", label: "New Arrivals"},
    { href: "/track", label: "Track an Order"},
    { href: "/return", label: "Returns & Refunds"}
    ]
   const footLinksCol2 = [
    { id: 1, href: "/about", label: "About"}, 
    { id: 2, href: "/contact", label: "Contact"},
    { id: 3, href: "/policies", label: "Policies"}
    ]
    return (
        <footer className="bg-[#16191E] border-t border-[#2A2F36] rounded-t-xl">
            <div className="px-5 py-6 ">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
            <div>
            <h3 className="font-archivo font-bold text-lg text-[#9AA1AB]">Shop</h3>
            <ul className="font-archivo mt-3 flex flex-col gap-2 text-[#F2F3F4]">
            {footLinksCol1.map(({ href, label }) => (
                <li key={href}>
                 <Link href={href}>{label}</Link>
                </li>
            ))}
            </ul>
            </div>

            <div>
            <h3 className="font-archivo font-bold text-lg text-[#9AA1AB]">Company</h3>
            <ul className="font-archivo mt-3 flex flex-col gap-2 text-[#F2F3F4]">
                {footLinksCol2.map(({ id, href, label }) => (
                <li key={id}>
                <Link href={href}>{label}</Link>
            </li>
            ))}
            </ul>
            </div>
            </div>

            <div className="font-archivo mt-8 text-center md:text-left text-[#9AA1AB]">
            © {new Date().getFullYear()} CANNAN LLC • California
            </div>
            </div>
        </footer>
    );
}