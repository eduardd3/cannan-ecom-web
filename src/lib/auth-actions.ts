import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import bcrypt from 'bcryptjs';   //  enables password hashing

import { authConfig } from '../../auth.config';
import { isStaff } from '@/lib/roles';
import { prisma } from '@/lib/prisma'

/**
 * Server-side NextAuth instance: shared config plus the credentials
 * providers. Imports Prisma and bcrypt, so it must not be used from the proxy.
 *
 * Callbacks are intentionally absent here — declaring a `callbacks` key
 * alongside the authConfig spread would replace the shared ones wholesale.
 */

async function getUser(email: string) {
    return prisma.user.findUnique({ where: {    email   }});    //  returns complete User information
}

const credentialsSchema = z.object({
    email: z.email(),
    password: z.string().min(6),
});

export const {handlers, auth, signIn, signOut} = NextAuth ({
    ...authConfig,
    providers: [
        Credentials({
            id: "customer-login",
            async authorize(credentials) {
            const parsed = credentialsSchema.safeParse(credentials);
            if (!parsed.success) return null;

            const user = await getUser(parsed.data.email);
            if (!user?.password) return null; // no row, or an OAuth-only account
            if (!await bcrypt.compare(parsed.data.password, user.password)) return null;

            // Auth.js types User.id as string; requireStaff() parses it back.
            return { id: String(user.id), email: user.email, role: user.role}
            }
        }),
        Credentials({
            id:"admin-login",
            async authorize(credentials) {
                const parsed = credentialsSchema.safeParse(credentials);

                if (!parsed.success) return null;
                const user = await getUser(parsed.data.email);
                if(!user?.password) return null;

                if (!isStaff(user.role)) return null;

                if (!await bcrypt.compare(parsed.data.password, user.password)) return null;

                return {id: String(user.id), email: user.email, role: user.role}
            }
        }),
    ],
});
