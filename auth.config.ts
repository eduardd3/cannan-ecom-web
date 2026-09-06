import type { NextAuthConfig } from 'next-auth';
 
export const authConfig = {
  pages: {
    signIn: '/sellercentral',
  },
  callbacks: { 
    authorized({    auth,   request: { nextUrl}}) {
        const loggedIn = !!auth?.user;
        const onDashboard = nextUrl.pathname.startsWith('/dashboard');

        if (onDashboard) { 
            if (loggedIn) { 
                return true;
            }
            return false; //   INVALID authentication -> redirect user to login page
        }
        else if (loggedIn) { 
            return Response.redirect(new URL ('/dashboard', nextUrl))   //  Redirect to request
        }
        return true;
    },
  }, 
  providers: [], 
} satisfies NextAuthConfig;