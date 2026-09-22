import type { Metadata } from "next";
import { Suspense } from 'react';
import CNSignIn from "./login-form"
import FormHeaderDark from '@/app/components/form-header-dark';

export const metadata: Metadata = {
    title: "Portal | Cannan",
    robots: { index: false },
};

export default function CNPortal() {
    return(
        <div className="flex w-full flex-1 flex-col">
            <header className="shrink-0">
                <FormHeaderDark />
            </header>
            <div className="flex flex-1 items-center justify-center p-6">
                <Suspense>  {/* required */}
                    <CNSignIn/>
                </Suspense>
            </div>
        </div>
    )
};
