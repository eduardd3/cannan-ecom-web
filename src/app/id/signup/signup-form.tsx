'use client'
import { useState} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link'
import PageHeading from '@/app/components/page-heading';
import FormBanner from '@/app/components/form/form-banner';
import TextField from '@/app/components/form/text-field';
import PasswordField from '@/app/components/form/password-field';
import SubmitButton from '@/app/components/form/submit-button';
import { textLinkClass } from '@/app/components/form/styles';
import { safeCallbackPath, signedInPath } from '@/lib/callback-url';
import { authCustomer } from '../../actions';

//  One object, so the message and the sign-in action are always cleared together.
type SignupError = { message: string; emailInUse?: boolean; signInHref?: string };

const FALLBACK_ERROR = 'Something went wrong. Please try again.';

//  Sign-in, keeping a callbackUrl sign-in passed along (e.g. back to checkout).
//  Checked here, at submit time, because window.location.origin doesn't exist
//  while this form renders on the server.
function signInHref(callbackUrl: string | null, query: Record<string, string> = {}) {
    const safe = safeCallbackPath(callbackUrl, window.location.origin);
    const params = new URLSearchParams({ ...query, ...(safe ? { callbackUrl: safe } : {}) }).toString();
    return params ? `/id/signin?${params}` : '/id/signin';
}

export default function SignupForm() {
    const router = useRouter();
    const callbackUrl = useSearchParams().get('callbackUrl');
    const [error, setError] = useState<SignupError | undefined>();
    const [isPending, setIsPending] = useState(false);

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(undefined);
        setIsPending(true);

        const formData = new FormData(event.currentTarget);
        //  Set once the sign-in redirect is under way, so the button stays
        //  "Creating account…" until the next page replaces this one.
        let navigating = false;
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
                    setError({ message: 'Email already in use.', emailInUse: true, signInHref: signInHref(callbackUrl) });
                    return;
                }
                const body = await response.json().catch(() => null);
                const message: string = body?.error ?? FALLBACK_ERROR;
                //  The banner wants a final period; not every API message has one.
                setError({ message: message.endsWith('.') ? message : `${message}.` });
                return;
            }

            //  Sign straight in, through the same action as the sign-in form, so
            //  a guest heading to checkout lands there with their cart merged
            //  (events.signIn). On success the action redirects and returns
            //  nothing. If it fails (e.g. the login rate limit), fall back to
            //  the sign-in page and its "Account created" notice.
            const credentials = new FormData();
            credentials.set('email', String(formData.get('email') ?? ''));
            credentials.set('password', String(formData.get('password') ?? ''));
            credentials.set('redirectTo', signedInPath(callbackUrl, window.location.origin));
            navigating = true;
            const signInError = await authCustomer(undefined, credentials);
            if (signInError) router.push(signInHref(callbackUrl, { verify: '1' }));
        } catch {
            navigating = false;
            setError({ message: FALLBACK_ERROR });
        } finally {
            if (!navigating) setIsPending(false);
        }
    }

    //  The page shell (header, footer, centering) lives in app/id/layout.tsx — this is just the card.
    return (
        <div className="w-full max-w-100">
            <PageHeading eyebrow="Bienvenido a myCANN" title="Create an account" subtitle="Para ti y los tuyos" />

            <form
                onSubmit={handleSubmit}
                aria-label="customer sign up"
                className="flex flex-col gap-5"
            >
                {error && (
                    <FormBanner
                        variant="error"
                        action={error.emailInUse ? { href: error.signInHref ?? '/id/signin', label: 'Sign in instead' } : undefined}
                    >
                        {error.message}
                    </FormBanner>
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
                    <Link href="/id/signin" className={textLinkClass}>
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
