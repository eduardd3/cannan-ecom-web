import type { ReactNode } from "react";
import Link from "next/link";

import Container from "@/app/components/container";
import GoldRule from "@/app/components/gold-rule";
import { PolicyTocDisclosure, PolicyTocSidebar } from "@/app/components/policy/policy-toc";
import type { PolicyCrossLink, PolicySection } from "@/app/components/policy/types";

//  A page with fewer sections than this is short enough to scan without an
//  "On this page" list.
const MIN_SECTIONS_FOR_TOC = 4;

const LINK = "text-gold-ink underline underline-offset-4 decoration-antique-gold/50 hover:decoration-gold-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antique-gold";

//  There is no typography plugin, so these descendant variants style the plain
//  p/ul/li/strong/a a page passes in, and pages stay free of per-element
//  classes. Class names must stay literal for Tailwind to find them.
const PROSE_LINKS =
  "[&_a]:text-gold-ink [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-antique-gold/50 [&_a]:hover:decoration-gold-ink [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-2 [&_a]:focus-visible:outline-antique-gold";

//  Bullets are a 4px antique-gold dot; top-3 centers it on the first line
//  (28px line height).
const PROSE = [
  "text-stone",
  "[&_p:not(:first-child)]:mt-4",
  "[&_ul:not(:first-child)]:mt-4 [&_ul]:space-y-3",
  "[&_li]:relative [&_li]:pl-5",
  "[&_li]:before:absolute [&_li]:before:top-3 [&_li]:before:left-1 [&_li]:before:size-1 [&_li]:before:rounded-full [&_li]:before:bg-antique-gold",
  "[&_strong]:font-medium [&_strong]:text-charcoal",
  PROSE_LINKS,
].join(" ");

type PolicyTemplateProps = {
  eyebrow: "Legal" | "Help";
  title: string;
  //  Shown as "Last updated …"; bump it whenever the policy's terms change.
  updated: string;
  //  Optional opening paragraph before the first section.
  lead?: ReactNode;
  sections: PolicySection[];
  crossLink: PolicyCrossLink;
};

//  Shared layout for Terms, Privacy, Shipping, and Returns & Refunds.
export default function PolicyTemplate({
  eyebrow,
  title,
  updated,
  lead,
  sections,
  crossLink,
}: PolicyTemplateProps) {
  const toc = sections.map(({ id, title }) => ({ id, title }));
  const showToc = sections.length >= MIN_SECTIONS_FOR_TOC;

  return (
    <Container className="pt-12 pb-20 md:pt-16 md:pb-24">
      <header className="mb-12 flex flex-col items-center text-center md:mb-16">
        <p className="mb-3 text-label-eyebrow text-gold-ink uppercase">{eyebrow}</p>
        <h1 className="mb-3 font-serif text-headline-lg text-charcoal">{title}</h1>
        <p className="text-caption text-stone">Last updated {updated}</p>
        <GoldRule className="mt-6" />
      </header>

      {/* lg, not md: at md the content area (~704px) can't hold a 65ch column
          and a sidebar side by side, so the disclosure is used up to lg. */}
      <div className={showToc ? "lg:grid lg:grid-cols-12 lg:gap-12" : ""}>
        {showToc && (
          <aside className="hidden lg:col-span-3 lg:block">
            <PolicyTocSidebar items={toc} />
          </aside>
        )}

        <article
          className={`mx-auto max-w-prose text-body-lg/7 ${showToc ? "lg:col-span-9 lg:mx-0" : ""}`}
        >
          {showToc && <PolicyTocDisclosure items={toc} />}

          {/* One lead style on every page: body size, set apart by charcoal
              (sections are stone) and by sitting above the first rule. */}
          {lead && <div className={`mb-8 text-charcoal ${PROSE_LINKS}`}>{lead}</div>}

          {sections.map(({ id, title, content }) => (
            //  Every section, the first included, gets the same top rule.
            //  scroll-mt-28 keeps the heading clear of the sticky header after
            //  an "On this page" jump.
            <section
              key={id}
              id={id}
              aria-labelledby={`${id}-heading`}
              className="mt-8 scroll-mt-28 border-t border-hairline/60 pt-8 first-of-type:mt-0"
            >
              <h2 id={`${id}-heading`} className="mb-4 font-serif text-headline-md font-normal text-charcoal">
                {title}
              </h2>
              <div className={PROSE}>{content}</div>
            </section>
          ))}

          <footer className="mt-12 flex flex-col gap-2 border-t border-hairline pt-6 text-body-md sm:flex-row sm:items-center sm:justify-between">
            <span className="text-stone">{crossLink.label}</span>
            <Link href={crossLink.href} className={`font-medium ${LINK}`}>
              {crossLink.linkText}
            </Link>
          </footer>
        </article>
      </div>
    </Container>
  );
}
