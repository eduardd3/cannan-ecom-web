
import Link from "next/link";
import {ArrowRightStartOnRectangleIcon, ShoppingBagIcon, UserIcon} from '@heroicons/react/24/outline';
import {signOutAction} from '@/app/actions';
import {getCartItemCount} from '@/lib/cart/queries';
import {getCurrentUserId} from '@/lib/cart/session';
import Container from '@/app/components/container';

//  TODO: add { href: "/arrivals", label: "New Arrivals" } once that page is
//  built; it's a placeholder for now.
const navLinks = [
    { href: "/products", label: "Shop" },
];

const iconLink = "flex items-center justify-center p-1 text-charcoal transition-colors hover:text-stone";

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
    return (
        <header className="sticky top-0 z-40 shrink-0 border-b border-hairline bg-gallery-white">
            <Container>
                {/* flex-wrap + order: from md up, links sit beside the logo in one
                    80px row; below md they drop to a second row instead of being
                    hidden, so phones can still reach Shop without a menu button. */}
                <nav aria-label="Main" className="flex flex-wrap items-center justify-between md:h-20 md:flex-nowrap md:justify-start md:gap-10">
                    {/* Text wordmark, matching the footer's. */}
                    <Link href="/" className="order-1 py-4 font-serif text-wordmark text-charcoal uppercase md:py-0">
                        CANNAN
                    </Link>

                    <ul className="order-3 flex w-full items-center gap-8 pb-3 md:order-2 md:w-auto md:pb-0">
                        {navLinks.map(({ href, label }) => (
                            <li key={href}>
                                <Link href={href} className="text-label-ui text-stone transition-colors hover:text-charcoal">
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </ul>

                    {/* TODO: search icon goes here once search has a backend. */}
                    <ul className="order-2 flex items-center gap-4 md:order-3 md:ml-auto">
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
                                {/* charcoal, not antique-gold: white on gold is too
                                    low-contrast at this size. */}
                                {cartCount > 0 && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute -top-1 -right-1.5 h-4 min-w-4 rounded-full bg-charcoal px-1 text-center text-[10px] leading-4 font-medium text-gallery-white"
                                    >
                                        {cartCount > 99 ? "99+" : cartCount}
                                    </span>
                                )}
                            </Link>
                        </li>
                        {signedIn && (
                            <li>
                                {/* A form, not a Link: sign-out is a POST. As a GET it
                                    would fire on <Link> prefetch, on crawl, and on any
                                    other site's <img src>. */}
                                <form action={signOutAction}>
                                    <button type="submit" aria-label="Sign out" className={`cursor-pointer ${iconLink}`}>
                                        <ArrowRightStartOnRectangleIcon aria-hidden="true" className="size-[22px]" />
                                    </button>
                                </form>
                            </li>
                        )}
                    </ul>
                </nav>
            </Container>
        </header>
    );
}
