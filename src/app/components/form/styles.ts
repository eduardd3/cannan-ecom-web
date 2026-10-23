//  Class strings shared by the form components, so the variants can't drift.

export type ButtonVariant = "primary" | "secondary";

//  Size, type and corners common to every full-width button. Keyboard focus
//  comes from the global :focus-visible rule in globals.css.
const buttonShapeClass =
  "flex h-12 w-full items-center justify-center rounded-control text-label-ui transition-colors";

//  Plus the pointer and the pending (disabled) state for the usable buttons.
//  The disabled: classes are inert on a link.
const buttonBaseClass = `${buttonShapeClass} cursor-pointer disabled:pointer-events-none disabled:opacity-75`;

//  Primary: charcoal fill, a touch lighter on hover. Secondary: 1px charcoal outline, no fill; border-box
//  keeps it the same 48px as primary.
const buttonVariantClass = {
  primary: "bg-charcoal text-gallery-white hover:bg-charcoal/90",
  secondary: "border border-charcoal bg-transparent text-charcoal hover:bg-charcoal/5",
} as const;

//  Full-width button: SubmitButton, ButtonLink, and plain <button type="button">s
//  that can't be a submit (e.g. a resend action inside another form).
export function buttonClass(variant: ButtonVariant = "primary") {
  return `${buttonBaseClass} ${buttonVariantClass[variant]}`;
}

//  A full-width button that can't be used right now (cart Checkout while the
//  cart has issues or checkout is closed). Hairline fill and stone text, so it
//  reads as off, not as pending; put it on a disabled <button>. Built on the
//  shape only, so no opacity dims the stone text further.
export const disabledButtonClass = `${buttonShapeClass} bg-hairline text-stone`;

//  Underlined gold-ink link below the forms. No font size: it inherits the
//  surrounding text. Works on a <Link> or a <button type="button">.
export const textLinkClass =
  "cursor-pointer text-gold-ink underline underline-offset-4 transition-colors hover:text-charcoal";

//  Centered stone body text between the heading and the actions on the /id
//  state screens (sent, invalid link, confirmed).
export const stateBodyClass = "mx-auto mb-8 max-w-95 text-body-lg text-stone";
