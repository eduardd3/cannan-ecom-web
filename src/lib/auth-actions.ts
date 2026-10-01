import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import bcrypt from 'bcryptjs';   //  enables password hashing

import { authConfig } from '../../auth.config';
import { isStaff } from '@/lib/roles';
import { prisma } from '@/lib/prisma'
import { emailSchema } from '@/lib/normalize-email'
import { checkLimit, clientIp, loginIpLimiter, loginLimiter } from '@/lib/rate-limit'

/**
 * Server-side NextAuth instance: shared config plus the credentials
 * providers. Imports Prisma and bcrypt, so it must not be used from the proxy.
 *
 * `callbacks` spreads authConfig.callbacks first — declaring the key on its
 * own would replace the shared ones wholesale. Only jwt is overridden, to add
 * the sessionVersion check the proxy can't do without a DB read.
 */

async function getUser(email: string) {
    return prisma.user.findUnique({ where: {    email   }}); 
}

const credentialsSchema = z.object({
    email: emailSchema,
    password: z.string().min(6),
});

// Surfaces as error.code on the AuthError signIn() throws in app/actions.ts.
class RateLimited extends CredentialsSignin {
    code = 'rate_limited';
}

// Runs before getUser/bcrypt so throttled attempts cost no DB read or hash.
// Every attempt counts, successful or not.
async function enforceLoginLimit(email: string, request: Request) {
    const ip = clientIp(request.headers);
    const [perAccount, perIp] = await Promise.all([
        checkLimit(loginLimiter, `${ip}:${email}`),
        checkLimit(loginIpLimiter, ip),
    ]);
    if (!perAccount.ok || !perIp.ok) throw new RateLimited();
}

export const {handlers, auth, signIn, signOut} = NextAuth ({
    ...authConfig,
    callbacks: {
        ...authConfig.callbacks,
        // Runs on every server-side auth() call. Returning null clears the
        // session, so bumping User.sessionVersion revokes existing logins.
        async jwt(params) {
            const { token, user } = params;
            if (user) return authConfig.callbacks.jwt(params);
            if (!token.sub) return null;

            const dbUser = await prisma.user.findUnique({
                select: { sessionVersion: true, emailVerified: true, role: true },
                where: { id: Number(token.sub) },
            });

            if (!dbUser) return null;
            if (dbUser.sessionVersion !== token.sessionVersion) return null;

            token.role = dbUser.role;
            token.emailVerified = dbUser.emailVerified != null;
            return token;
        },
    },
    providers: [
        Credentials({
            id: "customer-login",
            async authorize(credentials, request) {
            const parsed = credentialsSchema.safeParse(credentials);
            if (!parsed.success) return null;
            await enforceLoginLimit(parsed.data.email, request);

            const user = await getUser(parsed.data.email);
            if (!user?.password) return null; // no row, or an OAuth-only account
            if (!await bcrypt.compare(parsed.data.password, user.password)) return null;

            // Auth.js types User.id as string; requireStaff() parses it back.
            return { id: String(user.id), email: user.email, role: user.role, sessionVersion: user.sessionVersion, 
                emailVerified: user.emailVerified}  
            }
        }),
        Credentials({
            id:"admin-login",
            async authorize(credentials, request) {
                const parsed = credentialsSchema.safeParse(credentials);

                if (!parsed.success) return null;
                await enforceLoginLimit(parsed.data.email, request);
                const user = await getUser(parsed.data.email);
                if(!user?.password) return null;

                if (!isStaff(user.role)) return null;

                if (!await bcrypt.compare(parsed.data.password, user.password)) return null;

                return {id: String(user.id), email: user.email, role: user.role, sessionVersion: user.sessionVersion,
                    emailVerified: user.emailVerified}
            }
        }),
    ],
});
