/**
 * Public customer registration.
 *
 * Closed until checkout exists: accounts created now cannot buy anything, and
 * there is no password reset or email verification to support them with.
 *
 * Opt-in rather than opt-out, so an unset variable in any environment fails
 * closed. Set SIGNUP_ENABLED=true to reopen — on Vercel that needs a redeploy
 * to take effect.
 */
export function isSignupEnabled(): boolean {
    return process.env.SIGNUP_ENABLED === 'true';
}
