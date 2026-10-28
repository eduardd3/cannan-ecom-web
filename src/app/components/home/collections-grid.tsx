import Link from "next/link";

import Container from "@/app/components/container";
import GoldRule from "@/app/components/gold-rule";
import CollectionArt from "@/app/components/home/collection-art";
import type { CollectionView } from "@/lib/catalog/types";

export default function CollectionsGrid({ collections }: { collections: CollectionView[] }) {
  if (collections.length === 0) return null;

  return (
    //  id: the featured rail's end card links here (/#collections).
    //  scroll-mt keeps the heading clear of the sticky header.
    <section id="collections" aria-labelledby="collections-heading" className="scroll-mt-20">
      <Container className="py-16 md:py-24">
        <div className="mb-16 flex flex-col items-center text-center">
          <p className="mb-2 text-label-eyebrow text-gold-ink uppercase">Respectful spaces</p>
          <h2 id="collections-heading" className="mb-4 font-serif text-headline-lg text-charcoal">
            The Collections
          </h2>
          <GoldRule />
        </div>

        <ul className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6">
          {collections.map((collection) => (
            <li key={collection.slug}>
              <article className="flex flex-col">
                {/* TODO(image): Collection has no image field yet; typographic
                    placeholder at the card's 4:5 until it does. */}
                <CollectionArt slug={collection.slug} />
                <p className="mb-1.5 text-label-eyebrow text-gold-ink uppercase">Collection</p>
                <h3 className="mb-2.5 font-serif text-headline-md text-charcoal">{collection.name}</h3>
                <p className="mb-4 text-body-md text-stone">{collection.description}</p>
                <Link
                  href={`/collections/${collection.slug}`}
                  className="group inline-flex items-center gap-1 self-start text-label-ui text-gold-ink transition-colors hover:text-charcoal"
                >
                  <span className="underline underline-offset-4">Shop {collection.name}</span>
                  <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1"> →
                  </span>
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
