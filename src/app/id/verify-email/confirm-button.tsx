'use client'
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ResendButton } from '@/app/components/resend-button';

type Status = 'idle' | 'submitting' | 'success' | 'error';

// Confirms on click, not on load: mail scanners prefetch links and would
// otherwise spend the token before the user ever sees the page.
export function ConfirmButton({ token }: { token: string }) {
    const [status, setStatus] = useState<Status>('idle');
    const [errorMessage, setErrorMessage] = useState<string | undefined>();

    // Drop the token from the address bar and history once it's in memory.
    useEffect(() => {
        window.history.replaceState(null, '', '/id/verify-email');
    }, []);

    async function handleConfirm() {
        setStatus('submitting');
        setErrorMessage(undefined);
        try {
            const response = await fetch('/api/verification/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => null);
                setErrorMessage(body?.error ?? 'Something went wrong :(');
                setStatus('error');
                return;
            }

            setStatus('success');
        } catch {
            setErrorMessage('Something went wrong :(');
            setStatus('error');
        }
    }

    //  The two-column split lives in app/id/layout.tsx — this is just the card.
    if (status === 'success') {
        return (
            <div className="w-full max-w-sm rounded-xl border border-[#2A2F36] bg-[#16191E] p-8 shadow-sm">
                <h1 className="text-center text-xl font-bold text-[#F2F3F4]">
                    Email confirmed
                </h1>
                <p className="mt-4 text-sm text-[#9AA1AB]">
                    Thanks for confirming your email address.
                </p>
                <p className="mt-4 text-white">
                    <Link href="/myCANN/dashboard">Go to your dashboard</Link>
                </p>
            </div>
        );
    }

    const isPending = status === 'submitting';

    return (
        <div className="w-full max-w-sm rounded-xl border border-[#2A2F36] bg-[#16191E] p-8 shadow-sm">
            <h1 className="text-center text-xl font-bold text-[#F2F3F4]">
                Confirm your email
            </h1>
            <p className="mt-4 text-sm text-[#9AA1AB]">
                Click below to confirm this email address for your MyCANN account.
            </p>

            <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                aria-disabled={isPending}
                className="mt-6 h-11 w-full rounded-lg bg-[#F2F3F4] font-semibold text-[#16191E] transition-colors hover:bg-[#9AA1AB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2F3F4] disabled:opacity-50"
            >
                Confirm Email
            </button>
            <div
                className="flex min-h-8 items-start space-x-1"
                aria-live="polite"
                aria-atomic="true"
            >
            {errorMessage && (
            <>
                <ExclamationCircleIcon className="h-5 w-5 shrink-0 text-red-500" />
                <p className="text-sm text-red-500">{errorMessage}</p>
            </>
            )}
            </div>
            {status === 'error' && (
                <p className="mt-2 text-sm text-[#9AA1AB]">
                    <ResendButton />
                </p>
            )}
        </div>
    );
}
