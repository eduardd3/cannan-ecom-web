import 'server-only';
import {sendEmail} from '@/lib/email/client';
import {WelcomeEmail} from '@/emails/welcome';
import { PasswordReset } from '@/emails/passwordReset';
import { ConfirmReset } from '@/emails/confirmreset';
import { VerifyAccount } from '@/emails/verifyAccount';

export function sendWelcomeEmail (user: {email: string; name: string | null}) {
    return sendEmail ({
        to : user.email,
        subject: 'Welcome to Cannan',
        react: <WelcomeEmail name={user.name} />,
    })
}

export async function sendPasswordResetEmail (user: {email: string; name: string | null}, url: string) { 
    return sendEmail({ 
        to: user.email, 
        subject: 'Reset your MyCANN password',
        react: <PasswordReset name={user.name} email={user.email} url={url} />,
    })
}

export async function sendPasswordChangedEmail (user: {email: string; name: string | null}) { 
    return sendEmail({ 
        to: user.email,
        subject: 'Your MyCANN password was reset',
        react: <ConfirmReset name={user.name} />
    })
}

export async function sendVerificationEmail (user: {email: string; name: string | null}, url: string) { 
    return sendEmail({ 
        to: user.email,
        subject: 'Confirm your MyCANN account',
        react: <VerifyAccount name={user.name} url={url} />
    })
}
