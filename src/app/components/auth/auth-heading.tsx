import type { Ref } from "react";
import GoldRule from "@/app/components/gold-rule";

type AuthHeadingProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  //  Lets a form move focus to the title when it swaps to a new state, so
  //  screen readers announce the change. Makes the <h1> programmatically
  //  focusable only (tabIndex -1, no ring: it isn't interactive).
  titleRef?: Ref<HTMLHeadingElement>;
};

//  Eyebrow, serif title, italic subtitle and gold rule at the top of each
//  /id form. The headline tokens shrink below md on their own (globals.css).
export default function AuthHeading({ eyebrow, title, subtitle, titleRef }: AuthHeadingProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <p className="mb-2 text-label-eyebrow text-gold-ink uppercase">{eyebrow}</p>
      <h1
        ref={titleRef}
        tabIndex={titleRef ? -1 : undefined}
        className="mb-1 font-serif text-headline-lg text-charcoal outline-none"
      >
        {title}
      </h1>
      <p className="font-serif text-headline-md font-normal text-stone italic">{subtitle}</p>
      <GoldRule className="mt-4 mb-8" />
    </div>
  );
}
