
import Link from "next/link";
import {signOutAction} from '@/app/actions';
import {getCartItemCount} from '@/lib/cart/queries';
import {getCurrentUserId} from '@/lib/cart/session';
import Container from '@/app/components/container';

// auth() reads cookies, so every page under (storefront)/layout renders
// dynamically. Accepted over a <Suspense> island, which would restore static
// HTML but make the account area pop in late.
export default async function SiteHeader() {
    const userId = await getCurrentUserId();
    const signedIn = userId !== null;
    //  Signed out there's no cart to count (no guest carts yet).
    const cartCount = userId ? await getCartItemCount(userId) : 0;

    return (
        <header className="shrink-0 border-b bg-[#FCFCFA]">
            {/* Container, not the old hardcoded pl-10/pr-10: the header now sits
                on the same gutter and max width as the footer and page content,
                so the logo lines up with whatever a page renders below it. */}
            <Container>
                <nav aria-label="Main" className="flex w-full items-center justify-between py-2">
                    <Link href="/">
                        <img className="h-10" src="/images/cannan-logo.svg" alt="CANNAN" />
                    </Link>

                    <ul className="flex items-center gap-3">
                        <li>
                            <Link href="/cart" className="relative block">
                                <img src="/images/cart.svg" alt={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"} />
                                {cartCount > 0 && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute -top-1.5 -right-2 min-w-5 rounded-full bg-[#16191E] px-1 text-center text-xs leading-5 text-white"
                                    >
                                        {cartCount > 99 ? "99+" : cartCount}
                                    </span>
                                )}
                            </Link>
                        </li>
                        <li>
                            {/* Signed out, /myCANN is the sign-in / join splash;
                                signed in, skip straight to the dashboard. */}
                            <Link href={signedIn ? "/myCANN/dashboard" : "/myCANN"}>
                                <img src="/images/account.svg" alt={signedIn ? "Your account" : "Sign in"} />
                            </Link>
                        </li>
                        {signedIn && (
                            <li>
                                {/* A form, not a Link: sign-out is a POST. As a GET it
                                    would fire on <Link> prefetch, on crawl, and on any
                                    other site's <img src>. 
                                    
                                    cursor-pointer text-sm text-[#16191E] underline-offset-2 hover:underline
                                    */}
                                <form action={signOutAction}>
                                    <button
                                        type="submit"
                                        className="cursor-pointer mt-1"
                                    >
                                        <img src='/images/arrow-external.svg' alt="sign-out icon"/>
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
