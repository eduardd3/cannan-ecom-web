import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SignupForm from "./signup-form"
import { Suspense } from 'react';
import { isSignupEnabled } from "@/lib/flags";

export const metadata: Metadata = {
    title: "Sign Up | Cannan",
    description: "Sign Up Page",
    robots: { index: false },
};

export default function SignUpPage () {
    // Cosmetic only — /api/signup enforces the same flag. The flag is read at
    // build time for this static page, which is fine: changing it on Vercel
    // requires a redeploy regardless.
    if (!isSignupEnabled()) notFound();

    return (
        <Suspense>
            <SignupForm/>
        </Suspense>
    );
}
