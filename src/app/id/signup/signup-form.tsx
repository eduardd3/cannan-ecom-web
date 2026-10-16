'use client'
import { useState} from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'
import AuthHeading from '@/app/components/auth/auth-heading';
import AuthBanner from '@/app/components/auth/auth-banner';
import TextField from '@/app/components/auth/text-field';
import PasswordField from '@/app/components/auth/password-field';
import SubmitButton from '@/app/components/auth/submit-button';

//  One object, so the message and the sign-in action are always cleared together.
type SignupError = { message: string; emailInUse?: boolean };

const FALLBACK_ERROR = 'Something went wrong. Please try again.';

export default function SignupForm() {
    const router = useRouter();
    const [error, setError] = useState<SignupError | undefined>();
    const [isPending, setIsPending] = useState(false);

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(undefined);
        setIsPending(true);

        const formData = new FormData(event.currentTarget);
        try {
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.get('email'),
                    password: formData.get('password'),
                }),
            });

            if (!response.ok) {
                //  403 is /api/signup's duplicate-email response. Keyed off the
                //  status, not the message text, so rewording the API can't break it.
                if (response.status === 403) {
                    setError({ message: 'Email already in use.', emailInUse: true });
                    return;
                }
                const body = await response.json().catch(() => null);
                const message: string = body?.error ?? FALLBACK_ERROR;
                //  The banner wants a final period; not every API message has one.
                setError({ message: message.endsWith('.') ? message : `${message}.` });
                return;
            }

            router.push('/id/signin?verify=1'); //  redirect to login page after signing up
        } catch {
            setError({ message: FALLBACK_ERROR });
        } finally {
            setIsPending(false);
        }
    }

    //  The page shell (header, footer, centering) lives in app/id/layout.tsx — this is just the card.
    return (
        <div className="w-full max-w-100">
            <AuthHeading eyebrow="Bienvenido a myCANN" title="Create an account" subtitle="Para ti y los tuyos" />

            <form
                onSubmit={handleSubmit}
                aria-label="customer sign up"
                className="flex flex-col gap-5"
            >
                {error && (
                    <AuthBanner
                        variant="error"
                        action={error.emailInUse ? { href: '/id/signin', label: 'Sign in instead' } : undefined}
                    >
                        {error.message}
                    </AuthBanner>
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
                    autoComplete="new-password"
                    required
                    minLength={6}
                    helper="Must be at least 6 characters."
                />

                {/* mt-1 + the form's 20px gap = 24px above the button. */}
                <div className="mt-1">
                    <SubmitButton pending={isPending} pendingLabel="Creating account…">
                        Create account
                    </SubmitButton>
                </div>
            </form>

            <div className="mt-6 flex flex-col items-center gap-3 text-center">
                <p className="text-body-md text-stone">
                    Already have an account?{' '}
                    <Link href="/id/signin" className="text-gold-ink underline underline-offset-4 transition-colors hover:text-charcoal">
                        Sign in
                    </Link>
                </p>
                <p className="max-w-75 text-caption text-stone">
                    An account is required to place an order and complete checkout.
                </p>
            </div>
        </div>
    );
}
