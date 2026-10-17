'use client'
import { useRef } from 'react';
import AuthBanner from '@/app/components/auth/auth-banner';
import { buttonClass } from '@/app/components/auth/styles';
import { useResendVerification, type ResendResult } from '@/app/components/use-resend-verification';

type ResendBanner = {
    variant: 'success' | 'error';
    text: string;
    action?: { label: string; href: string };
    //  Trying again can help (after the cooldown, or past a transient error).
    retryable: boolean;
};

//  How the verify-email page words each /api/verification/send result.
export function resendBanner(result: ResendResult): ResendBanner {
    switch (result.kind) {
        case 'sent':
            return { variant: 'success', text: 'A new link is on its way. Check your email.', retryable: false };
        case 'already_verified':
            return {
                variant: 'success',
                text: 'Your email is already confirmed.',
                action: { label: 'Go to myCANN', href: '/myCANN/dashboard' },
                retryable: false,
            };
        case 'cooldown':
            return {
                variant: 'error',
                text: 'Please wait a couple of minutes before requesting another link.',
                retryable: true,
            };
        case 'signed_out':
            return {
                variant: 'error',
                text: 'Sign in to get a new link.',
                action: { label: 'Sign in', href: '/id/signin' },
                retryable: false,
            };
        case 'error':
            return { variant: 'error', text: 'Something went wrong. Please try again.', retryable: true };
    }
}

//  The missing-link screen's "Send a new link": result banner above a
//  secondary button. The button stays, so its banners need no retry action.
export function ResendLink() {
    const { resend, sending, result } = useResendVerification();
    const bannerRef = useRef<HTMLDivElement>(null);
    const banner = result && resendBanner(result);

    async function handleResend() {
        await resend();
        bannerRef.current?.focus();
    }

    return (
        <div className="flex w-full flex-col gap-5">
            {banner && (
                <AuthBanner variant={banner.variant} action={banner.action} bannerRef={bannerRef}>
                    {banner.text}
                </AuthBanner>
            )}
            <button
                type="button"
                onClick={handleResend}
                disabled={sending}
                className={buttonClass('secondary')}
            >
                {sending ? 'Sending…' : 'Send a new link'}
            </button>
        </div>
    );
}
