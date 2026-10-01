import type { Role } from '@/generated/prisma/client';
declare module "next-auth" {
    interface User { role: Role; sessionVersion: number; emailVerified: Date | null }
    interface Session { user: {id: string; email: string; role: Role; emailVerified: boolean} & DefaultSession["user"] }
}

//  The subpath is "next-auth/jwt". Augmenting "next/auth/jwt" (no such module)
//  fails silently — TS just declares an ambient module nobody imports, and
//  token.role falls back to `unknown` via JWT's Record<string, unknown>.
declare module "next-auth/jwt" {
    interface JWT { role: Role; sessionVersion: number; emailVerified: boolean }    //  snapshot
}
