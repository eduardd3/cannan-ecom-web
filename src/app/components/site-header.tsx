import Link from "next/link";

export default function SiteHeader() { 
    return (
        <header className="bg-[#FCFCFA] border-b"> 
            <nav aria-label="Main" className="flex w-full items-center justify-between">
                <Link href="/" className="p-2 pl-10">
                    <img className="h-10" src="/images/cannan-logo.svg" alt="CANNAN" />
                </Link>

                <div className="flex pr-10">
                    <ul className="flex items-center gap-3">
                        <li>
                            <Link href="/cart">
                                <img src="/images/cart.svg" alt="Cart" />
                            </Link>
                        </li>
                        <li>
                            <Link href="/account">
                                <img src="/images/account.svg" alt="Account" />
                            </Link>
                        </li>
                    </ul>
                </div>
            </nav>
        </header>
    );
}
/*
const navLinks = [
  // { href: "/", label: "Home" },
  //    { href: "/products", label: "Products"}
  // { href: "/about", label: "About" },
  // { href: "/contact", label: "Contact"}

];
<Link href="/" className="font-semibold text-[#16191E]">CANNAN</Link>
<ul className="flex gap-4"> 
                    {navLinks.map(({href, label}) => ( 
                        <li key={href}>
                            <Link href={href}>{label}</Link>
                        </li>
                    ))}
                </ul>
 */