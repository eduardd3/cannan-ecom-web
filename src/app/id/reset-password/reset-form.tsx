'use client'
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function ResetForm({ token }: { token: string }) {
    const router = useRouter();
    const [errorMessage, setErrorMessage] = useState<string | undefined>();
    const [isPending, setIsPending] = useState(false);

    // Drop the token from the address bar and history once it's in memory.
    useEffect(() => {
        window.history.replaceState(null, '', '/id/reset-password');
    }, []);

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage(undefined);

        const formData = new FormData(event.currentTarget);
        const password = formData.get('password');
        if (password !== formData.get('confirm')) {
            setErrorMessage('Passwords do not match.');
            return;
        }

        setIsPending(true);
        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => null);
                setErrorMessage(body?.error ?? 'Something went wrong :(');
                return;
            }

            router.push('/id/signin?reset=1');
        } catch {
            setErrorMessage('Something went wrong :(');
        } finally {
            setIsPending(false);
        }
    }

    //  The two-column split lives in app/id/layout.tsx — this is just the card.
    return (
        <form
            onSubmit={handleSubmit}
            aria-label="reset password"
            className="w-full max-w-sm"
        >
            <div className="w-full rounded-xl border border-[#2A2F36] bg-[#16191E] p-8 shadow-sm">
                <h1 className="text-center text-xl font-bold text-[#F2F3F4]">
                    Reset your password
                </h1>

                <div className="mt-6 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="password" className="text-sm text-[#9AA1AB]">
                            New password
                        </label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            autoComplete="new-password"
                            required
                            minLength={6}
                            className="h-10 w-full rounded-md border border-[#2A2F36] bg-[#0F1114] px-3 text-[#F2F3F4] outline-none focus:border-[#9AA1AB] focus-visible:ring-2 focus-visible:ring-[#9AA1AB]"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="confirm" className="text-sm text-[#9AA1AB]">
                            Confirm new password
                        </label>
                        <input
                            id="confirm"
                            type="password"
                            name="confirm"
                            autoComplete="new-password"
                            required
                            minLength={6}
                            className="h-10 w-full rounded-md border border-[#2A2F36] bg-[#0F1114] px-3 text-[#F2F3F4] outline-none focus:border-[#9AA1AB] focus-visible:ring-2 focus-visible:ring-[#9AA1AB]"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        aria-disabled={isPending}
                        className="mt-2 h-11 w-full rounded-lg bg-[#F2F3F4] font-semibold text-[#16191E] transition-colors hover:bg-[#9AA1AB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2F3F4] disabled:opacity-50"
                    >
                        Reset Password
                    </button>
                    <p className="text-white">
                        <Link href="/id/forgot-password">Request a new link</Link>
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
