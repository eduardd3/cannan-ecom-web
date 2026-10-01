import 'server-only';
import { TokenType } from '@/generated/prisma/client';
import { issueToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/email/messages';

// Fixed origin, never derived from the Host header: a spoofed Host would
// otherwise email a verification link pointing at the attacker's domain.
// Only `next dev` uses localhost; previews and production link to www.
const ORIGIN = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://www.shopcannan.com';
const VERIFY_BASE_URL = `${ORIGIN}/id/verify-email`;

/**
 * Issues a fresh verification token (invalidating older ones) and emails the
 * link. Never throws: callers run this in after(), where a failure should be
 * logged, not surface to the user — they can resend from the banner.
 *
 * Callers own the checks that decide whether to send (already verified,
 * cooldown); this only does the send.
 */
export async function sendVerificationLink(user: { id: number; email: string; name: string | null }) {
    try {
        const token = await issueToken(user.id, TokenType.EMAIL_VERIFICATION);
        const url = `${VERIFY_BASE_URL}?token=${encodeURIComponent(token)}`;
        const result = await sendVerificationEmail({ email: user.email, name: user.name }, url);
        if (!result.ok) console.error('verification: failed to send verification email');
    } catch (e) {
        console.error('verification: failed to issue verification link', e);
    }
}
