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

/**
 * Starting a Stripe checkout.
 *
 * Closed in production while Stripe is still in test mode: with test keys,
 * the live site would accept test cards and write real-looking orders and
 * stock deductions to the production database.
 *
 * Gates only new checkouts. The webhook and the return page ignore it, so a
 * payment already in flight when this is switched off still becomes an order.
 *
 * Opt-in, like SIGNUP_ENABLED: unset fails closed. Set CHECKOUT_ENABLED=true
 * per environment — on Vercel that needs a redeploy to take effect.
 */
export function isCheckoutEnabled(): boolean {
    return process.env.CHECKOUT_ENABLED === 'true';
}
