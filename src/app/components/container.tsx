//  The one place the site's content width and side gutters are defined. The
//  header, the footer and every storefront page wrap in this, so they line up
//  with each other and all move together when the width or gutter changes.
//
//  Two things to know when using it:
//
//  1. className is passed straight through and appended last, so a page can add
//     or override anything with plain Tailwind — no props to learn.
//  2. To center a page's content in the leftover space between header and
//     footer, keep Container as the OUTERMOST element of the page and give it
//     "flex flex-1 flex-col items-center justify-center". The flex-1 only works
//     from that position, because <main> in (storefront)/layout.tsx is the flex
//     column it stretches against.
type ContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Container({ children, className = "" }: ContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-5 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}
