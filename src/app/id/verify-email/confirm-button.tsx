'use client'
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import AuthHeading from '@/app/components/auth/auth-heading';
import AuthBanner from '@/app/components/auth/auth-banner';
import SubmitButton from '@/app/components/auth/submit-button';
import ButtonLink from '@/app/components/auth/button-link';
import { stateBodyClass, textLinkClass } from '@/app/components/auth/styles';
import { ResendButton } from '@/app/components/resend-button';

const FALLBACK_ERROR = 'Something went wrong. Please try again.';

//  'invalid' is the route's INVALID_LINK: retrying can't succeed, so the
//  confirm button goes away and the banner's action is the next step.
type Status = 'idle' | 'submitting' | 'confirmed' | 'invalid' | 'error';

// Confirms on click, not on load: mail scanners prefetch links and would
// otherwise spend the token before the user ever sees the page.
export function ConfirmButton({ token, isSignedIn }: { token: string; isSignedIn: boolean }) {
    const [status, setStatus] = useState<Status>('idle');
    const [errorMessage, setErrorMessage] = useState<string | undefined>();
    const confirmedHeadingRef = useRef<HTMLHeadingElement>(null);
    const bannerRef = useRef<HTMLDivElement>(null);

    // Drop the token from the address bar and history once it's in memory.
    useEffect(() => {
        window.history.replaceState(null, '', '/id/verify-email');
    }, []);

    //  Render the banner now so it exists to take focus.
    function showError(next: 'invalid' | 'error', message: string) {
        flushSync(() => {
            setErrorMessage(message);
            setStatus(next);
        });
        bannerRef.current?.focus();
    }

    async function handleConfirm(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage(undefined);
        setStatus('submitting');
        try {
            const response = await fetch('/api/verification/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            //  Keyed off the status, not the API's wording. The route answers
            //  400 with INVALID_LINK for every bad token.
            if (response.status === 400) {
                showError('invalid', 'This link is invalid or has expired.');
                return;
            }
            if (response.status === 429) {
                showError('error', 'Too many requests. Please try again later.');
                return;
            }
            if (!response.ok) {
                showError('error', FALLBACK_ERROR);
                return;
            }

            //  Focus the new heading, which tells screen-reader users the page changed.
            flushSync(() => setStatus('confirmed'));
            confirmedHeadingRef.current?.focus();
        } catch {
            showError('error', FALLBACK_ERROR);
        }
    }

    //  The page shell (header, footer, centering) lives in app/id/layout.tsx — this is just the card.
    if (status === 'confirmed') {
        return (
            <div className="w-full max-w-100 text-center">
                <AuthHeading
                    eyebrow="Correo confirmado"
                    title="Email confirmed"
                    subtitle="Para ti y los tuyos"
                    titleRef={confirmedHeadingRef}
                />
                <p className={stateBodyClass}>Your myCANN account is ready.</p>
                <div className="flex flex-col items-center gap-3">
                    <ButtonLink href="/myCANN/dashboard">Go to myCANN</ButtonLink>
                    <Link href="/products" className={`${textLinkClass} py-2 text-body-md`}>
                        Continue shopping
                    </Link>
                </div>
            </div>
        );
    }

    const isInvalid = status === 'invalid';

    return (
        <div className="w-full max-w-100 text-center">
            <AuthHeading eyebrow="Confirma tu correo" title="Confirm your email" subtitle="Un espacio para ti" />
            <p className={stateBodyClass}>
                One last step. Confirm this address to finish setting up your myCANN account.
            </p>

            <form onSubmit={handleConfirm} aria-label="confirm email" className="flex flex-col gap-5">
                {errorMessage && (
                    <AuthBanner
                        variant="error"
                        bannerRef={bannerRef}
                        action={
                            isInvalid && !isSignedIn
                                ? { label: 'Sign in to get a new link', href: '/id/signin' }
                                : undefined
                        }
                    >
                        {errorMessage}
                    </AuthBanner>
                )}

                {/* TODO(step 3): replace with the banner's "Send a new link" action. */}
                {isInvalid && isSignedIn && (
                    <p className="text-body-md">
                        <ResendButton />
                    </p>
                )}

                {!isInvalid && (
                    <SubmitButton pending={status === 'submitting'} pendingLabel="Confirming…">
                        Confirm email
                    </SubmitButton>
                )}
            </form>
        </div>
    );
}
