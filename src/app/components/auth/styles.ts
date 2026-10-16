//  Class strings shared by more than one /id element, so the variants can't drift.

//  Full-width charcoal button: SubmitButton and ButtonLink. The disabled:
//  classes are inert on a link.
export const primaryButtonClass =
  "flex h-12 w-full cursor-pointer items-center justify-center rounded-[2px] bg-charcoal text-label-ui text-gallery-white transition-colors hover:bg-stone focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antique-gold disabled:pointer-events-none disabled:opacity-75";

//  Underlined gold-ink link below the forms. No font size: it inherits the
//  surrounding text. Works on a <Link> or a <button type="button">.
export const textLinkClass =
  "cursor-pointer text-gold-ink underline underline-offset-4 transition-colors hover:text-charcoal";
