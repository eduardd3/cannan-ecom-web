import type { Metadata } from 'next';
import Link from 'next/link';
import PageHeading from '@/app/components/page-heading';
import ButtonLink from '@/app/components/form/button-link';
import { stateBodyClass, textLinkClass } from '@/app/components/form/styles';
import { getCurrentUserId } from '@/lib/cart/session';
import { getShopHref } from '@/lib/catalog/queries';
import { ConfirmButton } from './confirm-button';
import { ResendLink } from './resend-link';

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
    const shopHref = await getShopHref();

    // The token is only checked on confirm. Validating it here would make a
    // page load a way to probe tokens.
    if (typeof token !== 'string' || token.length === 0) {
        return (
            <div className="w-full max-w-100 text-center">
                <PageHeading eyebrow="Enlace no válido" title="Link invalid or expired" subtitle="Un espacio para ti" />
                <p className={stateBodyClass}>This confirmation link is invalid or has expired.</p>
                <div className="flex flex-col items-center gap-3">
                    {isSignedIn ? (
                        <>
                            <ResendLink />
                            <Link href={shopHref} className={`${textLinkClass} py-2 text-body-md`}>
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

    return <ConfirmButton token={token} isSignedIn={isSignedIn} shopHref={shopHref} />;
}
