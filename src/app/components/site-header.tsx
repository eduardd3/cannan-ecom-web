
import Link from "next/link";
import {ShoppingBagIcon, UserIcon} from '@heroicons/react/24/outline';
import {getCartItemCount} from '@/lib/cart/queries';
import {getCurrentUserId} from '@/lib/cart/session';
import Container from '@/app/components/container';
import NavLink from '@/app/components/nav-link';

//  /products redirects to the default collection, so the header never names
//  one. section: the paths where the link shows as active.
const navLinks = [
    { href: "/collections/signature", label: "Shop", section: ["/collections", "/products"] },
    { href: "/about", label: "About", section: ["/about"] },
];

//  size-11 is the 44px tap area; the 22px icon sits centered in it, so the
//  padding adds reach without moving or resizing what's drawn.
const iconLink = "flex size-11 items-center justify-center text-charcoal transition-colors hover:text-stone";

// auth() reads cookies, so every page under (storefront)/layout renders
// dynamically. Accepted over a <Suspense> island, which would restore static
// HTML but make the account area pop in late.
export default async function SiteHeader() {
    const userId = await getCurrentUserId();
    const signedIn = userId !== null;
    //  Signed out there's no cart to count (no guest carts yet).
    const cartCount = userId ? await getCartItemCount(userId) : 0;

    //  sticky, not fixed: it stays in the flow, so VerifyBanner below it (when
    //  shown) and the page need no top offset, and scroll under it instead.
    //  The announcement bar above it isn't sticky, so it scrolls away.
    return (
        <header className="sticky top-0 z-40 shrink-0 border-b border-hairline/60 bg-gallery-white">
            <Container>
                {/* One row at every width: 64px, 72px from md up. */}
                <nav aria-label="Main" className="flex h-16 items-center gap-3 md:h-18 md:gap-10">
                    {/* Text wordmark, matching the footer's. */}
                    <Link href="/" className="flex h-11 items-center font-serif text-wordmark text-charcoal uppercase">
                        CANNAN
                    </Link>

                    <ul className="flex items-center gap-5 md:gap-8">
                        {navLinks.map(({ href, label, section }) => (
                            <li key={href}>
                                <NavLink href={href} label={label} section={section} />
                            </li>
                        ))}
                    </ul>

                    {/* TODO: search icon goes here once search has a backend. */}
                    {/* -mr-[11px]: the last icon's tap area overhangs it by 11px,
                        so this puts the drawn icon on the gutter. */}
                    <ul className="ml-auto -mr-[11px] flex items-center">
                        <li>
                            {/* Signed out, /myCANN is the sign-in / join splash;
                                signed in, skip straight to the dashboard. */}
                            <Link
                                href={signedIn ? "/myCANN/dashboard" : "/myCANN"}
                                aria-label={signedIn ? "Your account" : "Sign in"}
                                className={iconLink}
                            >
                                <UserIcon aria-hidden="true" className="size-[22px]" />
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/cart"
                                aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
                                className={`relative ${iconLink}`}
                            >
                                <ShoppingBagIcon aria-hidden="true" className="size-[22px]" />
                                {/* A superscript on the bag, no badge. The icon
                                    spans 11–33px of the box, so top-[7px] is 4px
                                    above it and right-[3px] puts the number's
                                    right edge 8px past it, still inside the box.
                                    The link's aria-label already reads the count. */}
                                {cartCount > 0 && (
                                    <span aria-hidden="true" className="absolute top-[7px] right-[3px] text-[11px] leading-none font-medium">
                                        {cartCount > 9 ? "9+" : cartCount}
                                    </span>
                                )}
                            </Link>
                        </li>
                        {/* No sign-out here: it lives on the myCANN dashboard
                            (SignOutButton), away from the bag, where a mis-tap
                            can't log you out. That also frees the room About
                            needs at 390px. */}
                    </ul>
                </nav>
            </Container>
        </header>
    );
}
