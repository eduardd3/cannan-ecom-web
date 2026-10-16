'use client'
import Form from 'next/form';
import { useActionState } from 'react';
import {authCustomer} from '../../actions';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthHeading from '@/app/components/auth/auth-heading';
import AuthBanner from '@/app/components/auth/auth-banner';
import TextField from '@/app/components/auth/text-field';
import PasswordField from '@/app/components/auth/password-field';
import SubmitButton from '@/app/components/auth/submit-button';
import { textLinkClass } from '@/app/components/auth/styles';


// signupEnabled arrives as a prop because SIGNUP_ENABLED is server-only and
// this is a client component.
export default function LoginForm({ signupEnabled }: { signupEnabled: boolean }) {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || ('/myCANN/dashboard');
    const justReset = searchParams.get('reset') === '1';
    const justSignedUp = searchParams.get('verify') === '1';
    const [errorMessage, formAction, isPending] = useActionState(
        authCustomer,
        undefined,
    );
    //  Not every authCustomer message ends with a period; the banner wants one.
    //  Done here so the server strings, shared with the admin login, stay put.
    const errorText = errorMessage && (errorMessage.endsWith('.') ? errorMessage : `${errorMessage}.`);

    //  The page shell (header, footer, centering) lives in app/id/layout.tsx — this is just the card.
    return (
        <div className="w-full max-w-100">
            <AuthHeading eyebrow="Bienvenidos" title="Sign in to myCANN" subtitle="Un espacio para ti" />

            <Form   //  Client action
                action={formAction}
                aria-label="customer login form"
                className="flex flex-col gap-5"
            >
                {/* A failed attempt replaces the success notices: both at once
                    would read as contradictory. */}
                {errorText ? (
                    <AuthBanner variant="error">{errorText}</AuthBanner>
                ) : (
                    <>
                        {justSignedUp && (
                            <AuthBanner variant="success">
                                Account created. Check your email to verify your account.
                            </AuthBanner>
                        )}
                        {justReset && (
                            <AuthBanner variant="success">
                                Your password was reset. Sign in with your new password.
                            </AuthBanner>
                        )}
                    </>
                )}

                <TextField
                    id="email"
                    label="Email address"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                />

                <PasswordField
                    id="password"
                    label="Password"
                    name="password"
                    autoComplete="current-password"
                    required
                    labelAction={
                        <Link
                            href="/id/forgot-password"
                            className="text-caption text-gold-ink underline-offset-4 hover:underline"
                        >
                            Forgot password?
                        </Link>
                    }
                />

                <input type="hidden" name="redirectTo" value={callbackUrl} />
                {/* mt-1 + the form's 20px gap = 24px above the button. */}
                <div className="mt-1">
                    <SubmitButton pending={isPending} pendingLabel="Signing in…">
                        Sign in
                    </SubmitButton>
                </div>
            </Form>

            <div className="mt-6 flex flex-col items-center gap-3 text-center">
                {signupEnabled && (
                    <p className="text-body-md text-stone">
                        New to myCANN?{' '}
                        <Link href="/id/signup" className={textLinkClass}>
                            Create an account
                        </Link>
                    </p>
                )}
                <p className="max-w-75 text-caption text-stone">
                    An account is required to place an order and complete checkout.
                </p>
            </div>
        </div>
    );
}
