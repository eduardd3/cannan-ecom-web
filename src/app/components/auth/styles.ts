//  Class strings shared by more than one /id element, so the variants can't drift.

export type ButtonVariant = "primary" | "secondary";

//  Size, type, focus ring and disabled state common to every /id button. The
//  disabled: classes are inert on a link.
const buttonBaseClass =
  "flex h-12 w-full cursor-pointer items-center justify-center rounded-[2px] text-label-ui transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antique-gold disabled:pointer-events-none disabled:opacity-75";

//  Primary: charcoal fill. Secondary: 1px charcoal outline, no fill; border-box
//  keeps it the same 48px as primary.
const buttonVariantClass = {
  primary: "bg-charcoal text-gallery-white hover:bg-stone",
  secondary: "border border-charcoal bg-transparent text-charcoal hover:bg-charcoal/5",
} as const;

//  Full-width button: SubmitButton, ButtonLink, and plain <button type="button">s
//  that can't be a submit (e.g. a resend action inside another form).
export function buttonClass(variant: ButtonVariant = "primary") {
  return `${buttonBaseClass} ${buttonVariantClass[variant]}`;
}

//  Underlined gold-ink link below the forms. No font size: it inherits the
//  surrounding text. Works on a <Link> or a <button type="button">.
export const textLinkClass =
  "cursor-pointer text-gold-ink underline underline-offset-4 transition-colors hover:text-charcoal";

//  Centered stone body text between the heading and the actions on the /id
//  state screens (sent, invalid link, confirmed).
export const stateBodyClass = "mx-auto mb-8 max-w-95 text-body-lg text-stone";
