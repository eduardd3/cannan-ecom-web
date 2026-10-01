import type { Metadata } from 'next';
import { ResendButton } from '@/app/components/resend-button';
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

    // The token is only checked on confirm. Validating it here would make a
    // page load a way to probe tokens.
    if (typeof token !== 'string' || token.length === 0) {
        return (
            <div className="w-full max-w-sm rounded-xl border border-[#2A2F36] bg-[#16191E] p-8 shadow-sm">
                <h1 className="text-center text-xl font-bold text-[#F2F3F4]">
                    Link invalid or expired
                </h1>
                <p className="mt-4 text-sm text-[#9AA1AB]">
                    This confirmation link is invalid or has expired.
                </p>
                <p className="mt-4 text-sm text-[#9AA1AB]">
                    <ResendButton />
                </p>
            </div>
        );
    }

    return <ConfirmButton token={token} />;
}
