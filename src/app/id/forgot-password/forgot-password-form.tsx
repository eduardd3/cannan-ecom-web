'use client'
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import AuthHeading from '@/app/components/auth/auth-heading';
import AuthBanner from '@/app/components/auth/auth-banner';
import TextField from '@/app/components/auth/text-field';
import SubmitButton from '@/app/components/auth/submit-button';
import ButtonLink from '@/app/components/auth/button-link';
import { stateBodyClass, textLinkClass } from '@/app/components/auth/styles';

const FALLBACK_ERROR = 'Something went wrong. Please try again.';

export default function ForgotPasswordForm() {
    const [errorMessage, setErrorMessage] = useState<string | undefined>();
    const [isPending, setIsPending] = useState(false);
    const [sent, setSent] = useState(false);
    const sentHeadingRef = useRef<HTMLHeadingElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);

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
                //  Keyed off the status, not the API's wording.
                if (response.status === 429) {
                    setErrorMessage('Too many requests. Please try again later.');
                    return;
                }
                const body = await response.json().catch(() => null);
                const message: string = body?.error ?? FALLBACK_ERROR;
                //  The banner wants a final period; not every API message has one.
                setErrorMessage(message.endsWith('.') ? message : `${message}.`);
                return;
            }

            //  Render the sent state now so its heading exists to take focus,
            //  which tells screen-reader users the page changed.
            flushSync(() => setSent(true));
            sentHeadingRef.current?.focus();
        } catch {
            setErrorMessage(FALLBACK_ERROR);
        } finally {
            setIsPending(false);
        }
    }

    //  The form remounts, so the uncontrolled email input comes back empty.
    //  Focus follows it; the clicked button is gone.
    function handleUseDifferentEmail() {
        flushSync(() => setSent(false));
        emailRef.current?.focus();
    }

    //  The page shell (header, footer, centering) lives in app/id/layout.tsx — this is just the card.
    if (sent) {
        //  Same message whether or not the account exists, and never the address.
        return (
            <div className="w-full max-w-100 text-center">
                <AuthHeading
                    eyebrow="Correo enviado"
                    title="Check your email"
                    subtitle="Un espacio para ti"
                    titleRef={sentHeadingRef}
                />
                <p className={stateBodyClass}>
                    If an account exists for that email, we&apos;ve sent a link to reset
                    your password. The link expires in 1 hour.
                </p>
                <div className="flex flex-col items-center gap-3">
                    <ButtonLink href="/id/signin">Back to sign in</ButtonLink>
                    <button
                        type="button"
                        onClick={handleUseDifferentEmail}
                        className={`${textLinkClass} py-2 text-body-md`}
                    >
                        Use a different email
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-100">
            <AuthHeading eyebrow="Recuperar contraseña" title="Forgot password" subtitle="Para ti y los tuyos" />

            <form
                onSubmit={handleSubmit}
                aria-label="forgot password"
                className="flex flex-col gap-5"
            >
                {errorMessage && <AuthBanner variant="error">{errorMessage}</AuthBanner>}

                <TextField
                    ref={emailRef}
                    id="email"
                    label="Email address"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    helper="We'll send a link to reset your password."
                />

                {/* mt-1 + the form's 20px gap = 24px above the button. */}
                <div className="mt-1">
                    <SubmitButton pending={isPending} pendingLabel="Sending…">
                        Send reset link
                    </SubmitButton>
                </div>
            </form>

            <p className="mt-6 text-center text-body-md text-stone">
                Remembered it?{' '}
                <Link href="/id/signin" className={textLinkClass}>
                    Sign in
                </Link>
            </p>
        </div>
    );
}
