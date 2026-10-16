import type { Metadata } from "next";
import LoginForm from "./login-form"
import { Suspense } from 'react';
import { isSignupEnabled } from "@/lib/flags";

export const metadata: Metadata = {
    title: "Sign In | Cannan",
    description: "Sign In Page",
    robots: { index: false },
};

export default function SignInPage () {
    return (
        <Suspense>
            <LoginForm signupEnabled={isSignupEnabled()} />
        </Suspense>
    );
}
