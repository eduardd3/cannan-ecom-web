import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import Container from "@/app/components/container";
import { textLinkClass } from "@/app/components/form/styles";
import GoldRule from "@/app/components/gold-rule";
import Storefronts from "@/app/components/storefronts";

export const metadata: Metadata = {
  title: "About | Cannan",
  description:
    "Cannan curates meaningful pieces for every home and every tradition. For you and yours · Para ti y los tuyos.",
};

//  Cannan curates and brands its products rather than making them, so the
//  copy describes choosing pieces and never says "handmade" or "made by us".
//
//  The homepage says what Cannan is in one breath; this page says why and how.
//  So it carries only what the homepage doesn't: the story, the curation, the
//  full "many paths" reasoning, and the marketplaces. Collections and promises
//  live on the homepage.
//
//  Layout: "wall text". Every section is a narrow label column (4 of 12) and a
//  ~640px text column (8 of 12), so the whole page shares one left edge, unlike
//  the homepage's centered bands. Below md the columns stack.

const grid = "md:grid md:grid-cols-12 md:gap-x-12";
const textColumn = "md:col-span-8 max-w-160";
const bodyText = "text-body-lg text-stone [&>p+p]:mt-5";

function AboutSection({ id, heading, children }: { id: string; heading: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={`py-8 md:py-14 ${grid}`}>
      <div id={id} className="mb-4 md:col-span-4 md:mb-0">
        {heading}
      </div>
      <div className={`${textColumn} ${bodyText}`}>{children}</div>
    </section>
  );
}

//  Section headings: EB Garamond, regular weight (the headline-md token is 600).
const h2 = "font-serif text-headline-md font-normal text-charcoal";

export default function AboutUs() {
  return (
    <Container className="pt-14 pb-20 md:pt-28 md:pb-32">
      {/* The opening sentence is the hero: it sits beside the heading block as
          a large lede instead of a centered banner, so the page opens on the
          story rather than repeating the homepage's tagline. */}
      <section aria-labelledby="about-title" className={`pb-8 md:pb-18 ${grid}`}>
        <div className="md:col-span-4">
          <p lang="es" className="text-label-eyebrow text-gold-ink uppercase">Bienvenidos</p>
          <h1 id="about-title" className="mt-3 font-serif text-headline-lg text-charcoal">About Cannan</h1>
          <GoldRule className="mt-5 md:mt-6" />
        </div>
        <p className={`mt-8 font-serif text-[1.4375rem] leading-[1.4] text-charcoal md:mt-0 md:text-[1.875rem] ${textColumn}`}>
          Cannan began in California in 2022 with a simple belief: faith looks
          different in every home, and every home deserves a place to find what
          speaks to it.
        </p>
      </section>

      <AboutSection id="story" heading={<h2 className={h2}>Our Story</h2>}>
        <p>
          Our name comes from an ancient promise of a land where people could
          arrive, settle, and belong. We carry that spirit with us. Cannan is meant
          to be a place of welcome. Whatever you believe and however you pray, you
          can come as you are.
        </p>
      </AboutSection>

      {/* Pull quote: repeats a line from Our Story at display size, to slow
          the reader on the page's core idea. aria-hidden, since screen readers
          already read it in the paragraph above. */}
      <div aria-hidden="true" className={`pt-6 pb-8 md:pt-12 md:pb-16 ${grid}`}>
        <div className={`md:col-start-5 ${textColumn}`}>
          <GoldRule />
          <p className="mt-5 font-serif text-[1.625rem] leading-[1.3] text-charcoal italic md:mt-6 md:text-4xl">
            Whatever you believe and however you pray, you can come as you are.
          </p>
        </div>
      </div>

      <AboutSection id="what" heading={<h2 className={h2}>What We Do</h2>}>
        <p>
          We are curators. We look through the work of many makers to find pieces
          worth bringing into your home: pieces that carry meaning, are made well,
          and suit the people who’ll keep them.
        </p>
        <p>
          Whatever you find here, we hope it means something to you or to someone
          you love.
        </p>
      </AboutSection>

      <AboutSection
        id="paths"
        heading={
          <>
            <h2 lang="es" className={h2}>Muchos caminos, un hogar</h2>
            <p className="mt-1 font-serif text-body-lg text-stone italic md:text-xl">Many paths, one home</p>
          </>
        }
      >
        <p>
          Many of our customers come to us for one collection and discover the
          others along the way. We think that’s a good thing. You don’t have to
          share a belief to respect it, and you don’t have to belong to a tradition
          to learn about it.
        </p>
        <p>
          At Cannan, these traditions sit side by side. They are not mixed together
          and not compared. Each has its own space and its own dignity. Explore at
          your own pace and take home what speaks to you.
        </p>
      </AboutSection>

      <AboutSection id="elsewhere" heading={<h2 className={h2}>Find us elsewhere</h2>}>
        <p>You can also shop Cannan on Amazon and Walmart.</p>
        <div className="mt-2">
          <Storefronts />
        </div>
      </AboutSection>

      {/* The closing, in the brand's serif voice. No <hr>: the gold rule and
          the space above do that job. */}
      <section aria-label="Welcome" className={`pt-10 md:pt-18 ${grid}`}>
        <div className={`md:col-start-5 ${textColumn}`}>
          <GoldRule />
          <p className="mt-6 font-serif text-headline-md leading-[1.45] font-normal text-charcoal md:mt-7">
            Whether you’re looking for something for your own altar, a gift for
            someone close to you, or you’re simply curious about a tradition that
            isn’t your own: <span lang="es">bienvenidos</span>. You’re welcome here.
          </p>
          <p className="mt-4 font-serif text-body-lg text-stone italic md:text-xl">
            Cannan. For you and yours. <span lang="es">Para ti y los tuyos.</span>
          </p>
          <p className="mt-8 text-body-md text-stone md:mt-10">
            Read our{" "}
            <Link href="/shipping" className={textLinkClass}>Shipping</Link> and{" "}
            <Link href="/returns" className={textLinkClass}>Returns &amp; Refunds</Link>{" "}
            policies, or{" "}
            <Link href="/contact" className={textLinkClass}>get in touch</Link>.
          </p>
        </div>
      </section>
    </Container>
  );
}
