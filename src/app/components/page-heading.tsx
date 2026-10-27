import type { Ref } from "react";
import GoldRule from "@/app/components/gold-rule";

type PageHeadingProps = {
  //  Optional for a state with no eyebrow, e.g. "Order not found".
  eyebrow?: string;
  title: string;
  subtitle?: string;
  //  Lets a form move focus to the title when it swaps to a new state, so
  //  screen readers announce the change. Makes the <h1> programmatically
  //  focusable only (tabIndex -1, no ring: it isn't interactive).
  titleRef?: Ref<HTMLHeadingElement>;
  //  "start" for pages whose content is left-aligned under the heading, e.g.
  //  the myCANN dashboard. Centered everywhere else.
  align?: "center" | "start";
};

//  Eyebrow, serif title, optional italic subtitle and gold rule at the top of
//  the /id forms and the contact page. The headline tokens shrink below md on
//  their own (globals.css).
export default function PageHeading({ eyebrow, title, subtitle, titleRef, align = "center" }: PageHeadingProps) {
  return (
    <div className={`flex flex-col ${align === "start" ? "items-start text-left" : "items-center text-center"}`}>
      {eyebrow && <p className="mb-2 text-label-eyebrow text-gold-ink uppercase">{eyebrow}</p>}
      <h1
        ref={titleRef}
        tabIndex={titleRef ? -1 : undefined}
        className="mb-1 font-serif text-headline-lg text-charcoal outline-none"
      >
        {title}
      </h1>
      {subtitle && (
        <p className="font-serif text-headline-md font-normal text-stone italic">{subtitle}</p>
      )}
      <GoldRule className="mt-4 mb-8" />
    </div>
  );
}
