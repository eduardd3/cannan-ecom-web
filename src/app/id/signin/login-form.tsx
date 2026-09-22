'use client'
import Form from 'next/form';
import { ExclamationCircleIcon} from '@heroicons/react/24/outline';
import { useActionState } from 'react';
import {authCustomer} from '../../actions';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';


// signupEnabled arrives as a prop because SIGNUP_ENABLED is server-only and
// this is a client component.
export default function LoginForm({ signupEnabled }: { signupEnabled: boolean }) {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || ('/myCANN/dashboard');
    const [errorMessage, formAction, isPending] = useActionState(
        authCustomer,
        undefined,
    );
    //  two-column split lives in app/id/layout.tsx — this is just the card.
    return (
        <div className="w-full max-w-sm rounded-xl border border-[#2A2F36] bg-[#16191E] p-8 shadow-sm">
            <h1 className="text-center text-xl font-bold text-[#F2F3F4]">
               MyCANN Portal 
            </h1>

            <Form   //  Client action
                action={formAction}
                aria-label="customer login form"
                className="mt-6 flex flex-col gap-4"
            >
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

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="password" className="text-sm text-[#9AA1AB]">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        required
                        className="h-10 w-full rounded-md border border-[#2A2F36] bg-[#0F1114] px-3 text-[#F2F3F4] outline-none focus:border-[#9AA1AB] focus-visible:ring-2 focus-visible:ring-[#9AA1AB]"
                    />
                </div>
                {/* Handling login attempt: system responds with the appropriate result */}
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
                <input type="hidden" name="redirectTo" value={callbackUrl} />
                <div>
                    <button
                        type="submit"
                        disabled={isPending}
                        aria-disabled={isPending}
                        className="mt-2 h-11 w-full rounded-lg bg-[#F2F3F4] font-semibold text-[#16191E] transition-colors hover:bg-[#9AA1AB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2F3F4] disabled:opacity-50"
                    >
                        Sign In
                    </button>
                
                </div>
                
            </Form>

            {signupEnabled && (
                <div className="mt-3">
                    <p className="text-white"> Don&apos;t have an account? <Link href='/id/signup'>
                    Create an Account
                    </Link></p>
                </div>
            )}
        </div>
    );
}
