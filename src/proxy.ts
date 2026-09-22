import NextAuth from 'next-auth';
import { authConfig } from '../auth.config';

/**
 * Route protection at the edge.
 *
 * Must live at src/proxy.ts. Next resolves this file relative to the
 * directory containing `app`, so a root-level proxy.ts is ignored without
 * warning — the symptom is an empty .next/server/middleware-manifest.json
 * and no route guards.
 *
 * Imports the shared config only; pulling in the providers would bundle
 * Prisma and bcrypt into the proxy.
 */
export default NextAuth(authConfig).auth;

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
