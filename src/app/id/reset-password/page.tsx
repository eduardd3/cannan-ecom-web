import type { Metadata } from 'next';
import Link from 'next/link';
import AuthHeading from '@/app/components/auth/auth-heading';
import ButtonLink from '@/app/components/auth/button-link';
import { stateBodyClass, textLinkClass } from '@/app/components/auth/styles';
import { ResetForm } from './reset-form';

export const metadata: Metadata = {
    title: "Reset Password | Cannan",
    // The token is in the URL; don't leak it to linked sites.
    referrer: "no-referrer",
    robots: { index: false },
};

export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string | string[] }>;
}) {
    const { token } = await searchParams;

    // The token is only checked on submit. Validating it here would make a
    // page load a way to probe tokens.
    if (typeof token !== 'string' || token.length === 0) {
        return (
            <div className="w-full max-w-100 text-center">
                <AuthHeading eyebrow="Enlace no válido" title="Link invalid or expired" subtitle="Un espacio para ti" />
                <p className={stateBodyClass}>
                    This password reset link is invalid or has expired. Please request a new one to continue.
                </p>
                <div className="flex flex-col items-center gap-3">
                    <ButtonLink href="/id/forgot-password">Request a new link</ButtonLink>
                    <Link href="/id/signin" className={`${textLinkClass} py-2 text-body-md`}>
                        Back to sign in
                    </Link>
                </div>
            </div>
        );
    }

    return <ResetForm token={token} />;
}
