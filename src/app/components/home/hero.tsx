import Link from "next/link";

import Container from "@/app/components/container";
import GoldRule from "@/app/components/gold-rule";

//  shopHref: the same target as the header's Shop link (getShopHref), so the
//  button never opens a collection with nothing in it.
export default function Hero({ shopHref }: { shopHref: string }) {
  return (
    <section>
      <Container className="flex flex-col items-center py-16 text-center md:py-24">
        <div className="flex max-w-190 flex-col items-center">
          <p className="mb-4 text-label-eyebrow text-gold-ink uppercase">
            <span lang="es">Bienvenidos</span> · Curated in California
          </p>
          <h1 className="mb-6 font-serif text-display-hero text-charcoal">
            For you and yours
            <span lang="es" className="block font-normal italic">Para ti y los tuyos</span>
          </h1>
          {/* TODO(copy): hero subtitle. */}
          <p className="mb-8 max-w-155 text-body-lg text-stone">
            Devotional pieces for the altar and the home.
          </p>
          <Link
            href={shopHref}
            className="mb-12 inline-flex items-center justify-center rounded-control bg-charcoal px-7 py-3.5 text-label-ui text-gallery-white transition-colors hover:bg-charcoal/90"
          >
            Shop the collections
          </Link>
          <GoldRule />
        </div>

        {/* Still-life presentation: two panels side by side.
            TODO(image): replace each placeholder with a next/image still life. */}
        <div className="mt-16 grid w-full grid-cols-2 gap-4 md:gap-6">
          <div aria-hidden="true" className="aspect-4/5 bg-linen" />
          <div aria-hidden="true" className="aspect-4/5 bg-linen" />
        </div>
      </Container>
    </section>
  );
}
