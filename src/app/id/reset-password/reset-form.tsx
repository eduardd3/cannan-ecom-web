'use client'
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeading from '@/app/components/page-heading';
import FormBanner from '@/app/components/form/form-banner';
import PasswordField from '@/app/components/form/password-field';
import SubmitButton from '@/app/components/form/submit-button';
import { textLinkClass } from '@/app/components/form/styles';

//  One object, so the message and the request-a-new-link action are always cleared together.
type ResetError = { message: string; invalidLink?: boolean };

const FALLBACK_ERROR = 'Something went wrong. Please try again.';

//  Must match INVALID_LINK in app/api/reset-password/route.ts. The API sends
//  400 for this and for a short password, so the status alone can't tell them
//  apart. If the wording drifts, the banner just loses its action link.
const INVALID_LINK = 'This reset link is invalid or has expired.';

export function ResetForm({ token }: { token: string }) {
    const router = useRouter();
    const [error, setError] = useState<ResetError | undefined>();
    const [mismatch, setMismatch] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const confirmRef = useRef<HTMLInputElement>(null);

    // Drop the token from the address bar and history once it's in memory.
    useEffect(() => {
        window.history.replaceState(null, '', '/id/reset-password');
    }, []);

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(undefined);

        const formData = new FormData(event.currentTarget);
        const password = formData.get('password');
        if (password !== formData.get('confirm')) {
            //  Render the error before focusing, so the field is announced
            //  with aria-invalid and its message already in place.
            flushSync(() => setMismatch(true));
            confirmRef.current?.focus();
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
                //  Keyed off the status, not the API's wording.
                if (response.status === 429) {
                    setError({ message: 'Too many requests. Please try again later.' });
                    return;
                }
                const body = await response.json().catch(() => null);
                const message: string = body?.error ?? FALLBACK_ERROR;
                if (response.status === 400 && message === INVALID_LINK) {
                    setError({ message: INVALID_LINK, invalidLink: true });
                    return;
                }
                //  The banner wants a final period; not every API message has one.
                setError({ message: message.endsWith('.') ? message : `${message}.` });
                return;
            }

            router.push('/id/signin?reset=1');
        } catch {
            setError({ message: FALLBACK_ERROR });
        } finally {
            setIsPending(false);
        }
    }

    //  The page shell (header, footer, centering) lives in app/id/layout.tsx — this is just the card.
    return (
        <div className="w-full max-w-100">
            <PageHeading eyebrow="Nueva contraseña" title="Reset password" subtitle="Para ti y los tuyos" />

            <form
                onSubmit={handleSubmit}
                aria-label="reset password"
                className="flex flex-col gap-5"
            >
                {error && (
                    <FormBanner
                        variant="error"
                        action={error.invalidLink ? { href: '/id/forgot-password', label: 'Request a new link' } : undefined}
                    >
                        {error.message}
                    </FormBanner>
                )}

                <PasswordField
                    id="password"
                    label="New password"
                    name="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    helper="Must be at least 6 characters."
                    onChange={() => setMismatch(false)}
                />

                {/* No minLength here: the browser's too-short prompt would fire
                    before the mismatch check. The field above and the API enforce it. */}
                <PasswordField
                    ref={confirmRef}
                    id="confirm"
                    label="Confirm new password"
                    name="confirm"
                    autoComplete="new-password"
                    required
                    error={mismatch ? "Passwords don't match." : undefined}
                    onChange={() => setMismatch(false)}
                />

                {/* mt-1 + the form's 20px gap = 24px above the button. */}
                <div className="mt-1">
                    <SubmitButton pending={isPending} pendingLabel="Updating…">
                        Update password
                    </SubmitButton>
                </div>
            </form>

            <p className="mt-6 text-center text-body-md">
                <Link href="/id/signin" className={textLinkClass}>
                    Back to sign in
                </Link>
            </p>
        </div>
    );
}
