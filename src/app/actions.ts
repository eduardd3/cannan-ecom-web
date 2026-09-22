'use server';
import {signIn, signOut} from '@/lib/auth-actions';
import {AuthError} from 'next-auth';

export async function authCustomer (
    prev: string | undefined, 
    formData: FormData  // data from customer login form
    )
    { 
    try{ 
        await signIn ("customer-login", formData);
    }
    catch (error) { 

        if (error instanceof AuthError) { 
            switch(error.type) {
                case 'CredentialsSignin':    //   failed to verify user or null
                    return 'Incorrect login information'
                default: 
                    return 'Something went wrong'
            }
        }
        throw error;
    }
}

export async function authAdmin (
    prev: string | undefined, 
    formData: FormData
)
{ 
    try {
        await signIn("admin-login", formData);
    }
    catch (error) {
        // Only AuthError means bad credentials. Anything else must propagate,
        // notably the redirect signal signIn() throws on success.
        if (error instanceof AuthError) {
            switch(error.type) {
                case 'CredentialsSignin':
                    return 'Incorrect login information'
                default:
                    return 'Something went wrong'
            }
        }
        throw error;
    }
}
// Separate actions with hardcoded targets: accepting a redirect destination
// from the client would be an open redirect.
export async function signOutAction () {
    await signOut({ redirectTo: '/'});
}

export async function signOutAdminAction () {
    await signOut({ redirectTo: '/adm/portal'});
}