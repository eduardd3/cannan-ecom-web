import type { NextAuthConfig } from 'next-auth';
import { isStaff } from '@/lib/roles';

/**
 * Auth config shared by the proxy and the server-side NextAuth instance.
 *
 * Providers live in src/lib/auth-actions.ts so this module stays free of
 * Prisma and bcrypt. Every callback must be defined here: the proxy builds its
 * instance from this object alone, and authorized() depends on session()
 * having stamped the role.
 */
export const authConfig = {
  pages: {
    signIn: '/id/signin',
  },
  // Credentials providers require JWT sessions. Adding a database adapter
  // flips this default to "database" and silently breaks password login.
  session: { strategy: 'jwt' },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
        const user = auth?.user;
        const { pathname } = nextUrl;

        if (pathname.startsWith("/adm")) {
          const staff = isStaff(user?.role);

          if (pathname === "/adm/portal") {
            return staff
              ? Response.redirect(new URL("/adm/dashboard", nextUrl))
              : true;
          }

          // Redirect to the portal rather than returning false, which would
          // send admins to the customer sign-in page at pages.signIn.
          if (!staff) return Response.redirect(new URL("/adm/portal", nextUrl));
          return true;
        }

        if (pathname.startsWith("/myCANN/dashboard")) return !!user;

        return true;
    },

    // `user` is only set on sign-in, so this costs no DB read per request.
    // authorize() already resolved the row, leaving our id in token.sub.
    async jwt({ token, user }) {
        if (user) token.role = user.role;
        return token;
    },

    // Without this the session carries only name/email/image and every role
    // check fails closed.
    async session({ session, token }) {
        session.user.role = token.role;
        session.user.id = token.sub!;
        return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;