import 'server-only';
import {sendEmail} from '@/lib/email/client';
import {WelcomeEmail} from '@/emails/welcome';
import { PasswordReset } from '@/emails/passwordReset';
import { ConfirmReset } from '@/emails/confirmreset';
import { VerifyAccount } from '@/emails/verifyAccount';
import { OrderConfirmation, type OrderConfirmationProps } from '@/emails/orderConfirmation';
import { ContactMessage, type ContactMessageProps } from '@/emails/contactMessage';
import { SENDER_ORDERS } from '@/lib/email/senders';
import { SUPPORT_EMAIL } from '@/lib/contact';

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
        subject: 'Reset your myCANN password',
        react: <PasswordReset name={user.name} email={user.email} url={url} />,
    })
}

export async function sendPasswordChangedEmail (user: {email: string; name: string | null}) { 
    return sendEmail({ 
        to: user.email,
        subject: 'Your myCANN password was reset',
        react: <ConfirmReset name={user.name} />
    })
}

export async function sendVerificationEmail (user: {email: string; name: string | null}, url: string) { 
    return sendEmail({ 
        to: user.email,
        subject: 'Confirm your myCANN account',
        react: <VerifyAccount name={user.name} url={url} />
    })
}

//  The key makes a second send for the same order (two webhook deliveries
//  racing) a no-op at Resend.
export async function sendOrderConfirmationEmail (to: string, order: OrderConfirmationProps) {
    return sendEmail({
        to,
        from: SENDER_ORDERS,
        subject: `Your Cannan order #${order.orderId}`,
        react: <OrderConfirmation {...order} />,
        idempotencyKey: `order-confirmation/${order.orderId}`,
    })
}

//  Marks test sends so they stand out in the real support inbox.
const ENV_PREFIX =
    process.env.VERCEL_ENV === 'production' ? '' :
    process.env.VERCEL_ENV === 'preview' ? '[Preview] ' : '[Dev] ';

//  Contact form → support inbox. Reply-To is the customer, so answering is a
//  plain reply. The name is in the subject because Gmail threads identical
//  subjects from one sender together. No customer copy: the form accepts any
//  address, so an auto-reply would let anyone send our mail to strangers.
export async function sendContactEmail (msg: ContactMessageProps) {
    const order = msg.orderNumber ? ` · Order #${msg.orderNumber}` : '';
    return sendEmail({
        to: SUPPORT_EMAIL,
        replyTo: msg.email,
        subject: `${ENV_PREFIX}Contact: ${msg.topic} · ${msg.name}${order}`,
        react: <ContactMessage {...msg} />,
    })
}
