import type { Metadata } from 'next';
import ForgotPasswordForm from './forgot-password-form';

export const metadata: Metadata = {
    title: "Forgot Password | Cannan",
    // Same policy as the reset page, so the password-recovery flow never sends a Referer.
    referrer: "no-referrer",
    robots: { index: false },
};

export default function ForgotPasswordPage() {
    return <ForgotPasswordForm />;
}
