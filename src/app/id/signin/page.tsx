import type { Metadata } from "next";
import LoginForm from "./login-form"
import { Suspense } from 'react';

export const metadata: Metadata = {
    title: "Log In | Cannan",
    description: "Log In Page",
};

export default function SignInPage () {
    return (
        <Suspense>
            <LoginForm/>
        </Suspense>
    );
}
