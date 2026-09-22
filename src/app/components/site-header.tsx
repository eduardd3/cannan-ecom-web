
import Link from "next/link";
import {auth} from '@/lib/auth-actions';
import {signOutAction} from '@/app/actions';
import Container from '@/app/components/container';

// auth() reads cookies, so every page under (storefront)/layout renders
// dynamically. Accepted over a <Suspense> island, which would restore static
// HTML but make the account area pop in late.
export default async function SiteHeader() {
    const session = await auth();
    //  auth() returns Session | null — session.user would throw when logged out
    const signedIn = !!session?.user;

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
                            <Link href="/cart">
                                <img src="/images/cart.svg" alt="Cart" />
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
                                        className="cursor-pointer"
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
