import type { Metadata } from 'next';
import Link from 'next/link';
import AuthHeading from '@/app/components/auth/auth-heading';
import ButtonLink from '@/app/components/auth/button-link';
import { stateBodyClass, textLinkClass } from '@/app/components/auth/styles';
import { ResendButton } from '@/app/components/resend-button';
import { getCurrentUserId } from '@/lib/cart/session';
import { ConfirmButton } from './confirm-button';

export const metadata: Metadata = {
    title: "Confirm Email | Cannan",
    // The token is in the URL; don't leak it to linked sites.
    referrer: "no-referrer",
    robots: { index: false },
};

export default async function VerifyEmailPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string | string[] }>;
}) {
    const { token } = await searchParams;
    // Session only, never the token: picks which next step to offer.
    const isSignedIn = (await getCurrentUserId()) !== null;

    // The token is only checked on confirm. Validating it here would make a
    // page load a way to probe tokens.
    if (typeof token !== 'string' || token.length === 0) {
        return (
            <div className="w-full max-w-100 text-center">
                <AuthHeading eyebrow="Enlace no válido" title="Link invalid or expired" subtitle="Un espacio para ti" />
                <p className={stateBodyClass}>This confirmation link is invalid or has expired.</p>
                <div className="flex flex-col items-center gap-3">
                    {isSignedIn ? (
                        <>
                            {/* TODO(step 3): replace with the secondary "Send a new link" button. */}
                            <p className="text-body-md">
                                <ResendButton />
                            </p>
                            <Link href="/products" className={`${textLinkClass} py-2 text-body-md`}>
                                Continue shopping
                            </Link>
                        </>
                    ) : (
                        <>
                            <ButtonLink href="/id/signin">Sign in to get a new link</ButtonLink>
                            <Link href="/id/signin" className={`${textLinkClass} py-2 text-body-md`}>
                                Back to sign in
                            </Link>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return <ConfirmButton token={token} isSignedIn={isSignedIn} />;
}
