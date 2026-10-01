'use client'
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordForm() {
    const [errorMessage, setErrorMessage] = useState<string | undefined>();
    const [isPending, setIsPending] = useState(false);
    const [sent, setSent] = useState(false);

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage(undefined);
        setIsPending(true);

        const formData = new FormData(event.currentTarget);
        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.get('email') }),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => null);
                setErrorMessage(body?.error ?? 'Something went wrong :(');
                return;
            }

            setSent(true);
        } catch {
            setErrorMessage('Something went wrong :(');
        } finally {
            setIsPending(false);
        }
    }

    //  The two-column split lives in app/id/layout.tsx — this is just the card.
    if (sent) {
        // Same message whether or not the account exists.
        return (
            <div className="w-full max-w-sm rounded-xl border border-[#2A2F36] bg-[#16191E] p-8 shadow-sm">
                <h1 className="text-center text-xl font-bold text-[#F2F3F4]">
                    Check your email
                </h1>
                <p className="mt-4 text-sm text-[#9AA1AB]">
                    If an account exists for that email, we&apos;ve sent a link to reset
                    your password. The link expires in 1 hour.
                </p>
                <p className="mt-4 text-white">
                    <Link href="/id/signin">Back to log in</Link>
                </p>
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            aria-label="forgot password"
            className="w-full max-w-sm"
        >
            <div className="w-full rounded-xl border border-[#2A2F36] bg-[#16191E] p-8 shadow-sm">
                <h1 className="text-center text-xl font-bold text-[#F2F3F4]">
                    Forgot your password?
                </h1>
                <p className="mt-2 text-center text-sm text-[#9AA1AB]">
                    Enter your email and we&apos;ll send you a reset link.
                </p>

                <div className="mt-6 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="email" className="text-sm text-[#9AA1AB]">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            required
                            className="h-10 w-full rounded-md border border-[#2A2F36] bg-[#0F1114] px-3 text-[#F2F3F4] outline-none focus:border-[#9AA1AB] focus-visible:ring-2 focus-visible:ring-[#9AA1AB]"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isPending}
                        aria-disabled={isPending}
                        className="mt-2 h-11 w-full rounded-lg bg-[#F2F3F4] font-semibold text-[#16191E] transition-colors hover:bg-[#9AA1AB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2F3F4] disabled:opacity-50"
                    >
                        Send Reset Link
                    </button>
                    <p className="text-white">
                        <Link href="/id/signin">Back to log in</Link>
                    </p>
                    <div
                        className="flex h-8 items-end space-x-1"
                        aria-live="polite"
                        aria-atomic="true"
                    >
                    {errorMessage && (
                    <>
                        <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                        <p className="text-sm text-red-500">{errorMessage}</p>
                    </>
                    )}
                    </div>
                </div>
            </div>
        </form>
    );
}
