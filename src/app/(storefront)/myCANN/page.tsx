import type { Metadata } from "next";
import Link from 'next/link';
import Container from "@/app/components/container";
import GoldRule from "@/app/components/gold-rule";
import AccountFeatures from "@/app/components/mycann/account-features";
import { isSignupEnabled } from "@/lib/flags";

//  Site chrome comes from the (storefront) group layout — this segment used to
//  carry a duplicate copy of it. Signed-in visitors never see this page: the
//  proxy's authorized() callback in auth.config.ts redirects them to the
//  dashboard.
export const metadata: Metadata = {
    title: "myCANN | Cannan",
    description: "Sign in to your Cannan account",
};

const buttonBase =
    "block w-full rounded-[2px] px-6 py-3.5 text-center text-label-ui transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-antique-gold";

//  Container stays the outermost element with flex-1 so the doorway sits
//  centered between header and footer (see container.tsx).
export default function MyCANNPage () {
    const signupOpen = isSignupEnabled();

    return (
        <Container className="flex flex-1 flex-col items-center justify-center py-12 md:py-20">
            <div className="w-full max-w-140 text-center">
                <p className="mb-3 text-label-eyebrow text-gold-ink uppercase">
                    <span lang="es">Bienvenidos</span> · Your portal
                </p>
                <h1 className="font-serif text-headline-lg text-charcoal">myCANN</h1>
                <p lang="es" className="mt-1 font-serif text-headline-md font-normal text-stone italic">
                    Un espacio para ti
                </p>

                <GoldRule className="mx-auto my-5" />

                {/* TODO(copy): intro paragraph, both versions. */}
                <p className="mx-auto mb-10 max-w-115 text-body-lg text-stone">
                    {signupOpen
                        ? "Sign in to see your orders and pick up your cart where you left off, or create an account to check out."
                        : "Sign in to see your orders and pick up your cart where you left off."}
                </p>

                <div className="mx-auto flex max-w-95 flex-col gap-4">
                    <Link
                        href="/id/signin"
                        className={`${buttonBase} bg-charcoal text-gallery-white hover:bg-stone`}
                    >
                        Sign in
                    </Link>
                    {signupOpen ? (
                        <Link
                            href="/id/signup"
                            className={`${buttonBase} border border-charcoal text-charcoal hover:bg-linen`}
                        >
                            Create an account
                        </Link>
                    ) : (
                        //  Same vertical padding as a button so the column keeps
                        //  its height. TODO(copy): signup-closed note.
                        <p className="py-3.5 text-body-md text-stone">
                            New accounts are opening soon.
                        </p>
                    )}
                </div>

                <p className="mx-auto mt-6 max-w-100 text-caption text-stone">
                    An account is required to place an order and complete checkout.
                </p>

                <AccountFeatures />
            </div>
        </Container>
    );
}
