import type { Metadata } from "next";
import SignupForm from "./signup-form"
import { Suspense } from 'react';

export const metadata: Metadata = {
    title: "Sign Up | Cannan",
    description: "Sign Up Page",
};

export default function SignUpPage () {
    return (
        <Suspense>
            <SignupForm/>
        </Suspense>
    );
}
