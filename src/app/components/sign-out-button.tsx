"use client";

import { useFormStatus } from "react-dom";

import { signOutAction } from "@/app/actions";
import SubmitButton from "@/app/components/form/submit-button";

//  useFormStatus reads the <form> it sits in, so it has to live in a child of
//  that form, not in the component that renders it.
function SignOutSubmit() {
    const { pending } = useFormStatus();
    return (
        <SubmitButton pending={pending} pendingLabel="Signing out…" variant="secondary">
            Sign out
        </SubmitButton>
    );
}

//  A form, not a Link: sign-out is a POST. As a GET it would fire on <Link>
//  prefetch, on crawl, and on any other site's <img src>. The button disables
//  while the action runs, so a double tap can't submit twice. className sizes
//  the form; the button fills it.
export default function SignOutButton({ className = "" }: { className?: string }) {
    return (
        <form action={signOutAction} className={className}>
            <SignOutSubmit />
        </form>
    );
}
