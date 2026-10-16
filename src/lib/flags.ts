/**
 * Public customer registration.
 *
 * Off, /id/signup and POST /api/signup both 404, and the Join links on
 * /myCANN and the sign-in form are hidden. Existing accounts can still sign in.
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

/**
 * The public product catalog: the /products listing and /products/[slug].
 *
 * Closed while the products page is still being built and tested. Off, the
 * listing shows its empty state without querying the database, and product
 * pages 404 so a direct link can't reach one either. Cart and checkout are not
 * gated here; CHECKOUT_ENABLED covers buying.
 *
 * Opt-in, like the others: unset fails closed. Set CATALOG_ENABLED=true per
 * environment — on Vercel that needs a redeploy to take effect.
 */
export function isCatalogEnabled(): boolean {
    return process.env.CATALOG_ENABLED === 'true';
}
