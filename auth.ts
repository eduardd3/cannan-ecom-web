import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import {z} from 'zod';

import type {User} from '@/app/lib/definitions';
import bcrypt from 'bcryptjs';   //  enables password hashing

// TODO: not wired up to a real database yet. Once the users table exists
// (Prisma's `User` model has no `password` field yet), replace this with a
// Prisma query.
async function getUser(email: string): Promise<User | undefined> {
    console.warn(`getUser("${email}") is a stub — no database is wired up yet.`);
    return undefined;
}

export const { auth, signIn, signOut } = NextAuth ({

    ...authConfig,
    providers: [Credentials({async authorize(credentials) {
            const parsedCredentials = z.object({email: z.string().email(),
                password: z.string().min(6)
            }).safeParse(credentials) ;  //  validate user email and passsword

            if (parsedCredentials.success) {
                const {email, password } = parsedCredentials.data;
                const user = await getUser(email);
                if (!user) return null;
                const passwordsMatch = await bcrypt.compare(password, user.password);   //  check: password is a match
                if (passwordsMatch) return user;
            }
            return null;
        }

    })],   //  different login options (e.g, Google, Apple ID?)
});
