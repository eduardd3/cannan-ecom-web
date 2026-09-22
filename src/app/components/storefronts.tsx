import Link from 'next/link'
import { FaAmazon} from 'react-icons/fa'
import { TbBrandWalmart } from "react-icons/tb"

export default function Storefronts () { 
    const storeLinks = [
        {href: 'https://www.amazon.com/s?me=A17J8ESNV6NKND&marketplaceID=ATVPDKIKX0DER', icon: FaAmazon, label: 'Amazon'},
        {href: 'https://www.walmart.com/seller/102911568', icon: TbBrandWalmart, label: 'Walmart'}
    ]
    return (
        <ul className="flex gap-3"> 
            {storeLinks.map(({ href, icon: Icon, label }) => (
                <li key={label}>
                 <Link href={href}>
                    <Icon className="w-6 h-6" aria-label={label} />
                </Link>
                </li>
            ))}
        </ul>
    );
}