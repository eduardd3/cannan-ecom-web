import Link from "next/link";

import Container from "@/app/components/container";
import GoldRule from "@/app/components/gold-rule";

//  Full-width linen band: the background spans the viewport, so Container sits
//  inside the section instead of around it.
export default function Narrative() {
  return (
    <section className="my-12 bg-linen">
      <Container className="flex flex-col items-center py-16 text-center md:py-24">
        <div className="flex max-w-200 flex-col items-center">
          <p lang="es" className="mb-3 text-label-eyebrow text-gold-ink uppercase">
            Nuestro propósito
          </p>
          <h2 lang="es" className="mb-2 font-serif text-headline-lg text-charcoal">
            Muchos caminos, un hogar
          </h2>
          <p className="mb-8 font-serif text-headline-md text-stone italic">
            Many paths, one home
          </p>
          <GoldRule className="mb-8" />
          {/* TODO(copy): narrative paragraph. */}
          <p className="max-w-170 text-body-lg text-charcoal">
            We carry pieces for many traditions and treat each one with the same care. Whatever brings you here, you’re welcome.
          </p>
          {/* The short version lives here; About has the full story. min-h-11
              makes it a 44px tap target; the arrow nudges like the list rows'.
              The underline goes on the words only: set on the link, it would
              carry through to the arrow, because flex items inherit their
              parent's text decoration. */}
          <Link
            href="/about"
            className="group mt-5 inline-flex min-h-11 items-center gap-2 text-label-ui text-gold-ink transition-colors hover:text-charcoal"
          >
            <span className="underline underline-offset-4">Read our story</span>
            <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→
            </span>
          </Link>
        </div>
      </Container>
    </section>
  );
}
