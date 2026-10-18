import type { ReactNode } from "react";
import { stateBodyClass } from "@/app/components/form/styles";

type StateBlockProps = {
  title: string;
  body: string;
  //  The actions, e.g. a ButtonLink and a text link. They stack in a column
  //  capped at 320px, so a full-width ButtonLink doesn't span the page.
  children: ReactNode;
};

//  Centered heading, body and actions for a page's empty or signed-out state
//  (the cart). An <h2>, because the page keeps its own <h1> above it. The
//  body matches the /id state screens through stateBodyClass.
export default function StateBlock({ title, body, children }: StateBlockProps) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <h2 className="mb-3 font-serif text-headline-md font-normal text-charcoal">{title}</h2>
      <p className={stateBodyClass}>{body}</p>
      <div className="flex w-full max-w-80 flex-col items-center gap-3">{children}</div>
    </div>
  );
}
