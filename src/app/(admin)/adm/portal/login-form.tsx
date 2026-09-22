'use client' // render on client side
import Form from 'next/form';
import { ExclamationCircleIcon} from '@heroicons/react/24/outline';

import {authAdmin} from '@/app/actions';
import { useSearchParams } from 'next/navigation';
import { useActionState } from 'react';


export default function CNLoginForm () { 
    const searchParams = useSearchParams(); //  read current URL query string
    // Must not fall back to '': signIn() only supplies its own default when
    // redirectTo is nullish, and an empty string makes Auth.js fall back to a
    // stale authjs.callback-url cookie instead.
    const callbackUrl = searchParams.get('callbackUrl') || ('/adm/dashboard');    //  first value of either search parameter
    const [errMessage, formAction, isPending] = useActionState (
        authAdmin,
        undefined,
    );
    //  structure lives in app/(admin)/layout.tsx
    return ( 
       <div className="w-full max-w-sm rounded-xl border border-[#2A2F36] bg-[#16191E] p-8 shadow-sm">
        <h1 className="text-center text-xl font-bold text-[#F2F3F4]">
            Cannan Portal
        </h1>
        <Form
            action={formAction}
            aria-label="store manager login form"
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
                className="h-10 w-full rounded-md border border-[#2A2F36] bg-[#0f1114] px-3 text-[#f2f3f4] outline-none focus:border-[#9AA1AB] focus-visible:ring-2 focus-visible:ring-[#9AA1AB]"
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
            <div
                className="flex h-8 items-end space-x-1"
                aria-live="polite"
                aria-atomic="true"
            >
                {errMessage && (
                    <>
                        <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                        <p className="text-sm text-red-500">{errMessage}</p>
                    </>
                )}
            </div>
            <input type="hidden" name="redirectTo" value={callbackUrl}/> {/* submit page redirect value with the form */}
            <div>
                <button
                type="submit"
                disabled={isPending}
                aria-disabled={isPending}
                className="mt-2 h-11 w-full rounded-lg bg-[#F2F3F4] font-semibold text-[#16191E] transition-colors hover:bg-[#9AA1AB] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#F2F3F4] disabled:opacity-50"
                >
                    Log in
                </button>
            </div>

        </Form>
       </div>
    )
}