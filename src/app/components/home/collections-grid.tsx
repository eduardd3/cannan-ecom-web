import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

import Container from "@/app/components/container";
import GoldRule from "@/app/components/gold-rule";
import type { CollectionView } from "@/lib/catalog/types";

export default function CollectionsGrid({ collections }: { collections: CollectionView[] }) {
  if (collections.length === 0) return null;

  return (
    <section aria-labelledby="collections-heading">
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
                {/* TODO(image): Collection has no image field yet; placeholder at the card's 4:5. */}
                <div aria-hidden="true" className="mb-6 aspect-4/5 w-full bg-linen" />
                <p className="mb-1.5 text-label-eyebrow text-gold-ink uppercase">Collection</p>
                <h3 className="mb-2.5 font-serif text-headline-md text-charcoal">{collection.name}</h3>
                <p className="mb-4 text-body-md text-stone">{collection.description}</p>
                {/* TODO: link to /collections/[slug] once it exists; /products
                    only lists the default collection for now. */}
                <Link
                  href="/products"
                  className="inline-flex items-center gap-1 self-start text-label-ui text-gold-ink underline underline-offset-4 transition-colors hover:text-charcoal"
                >
                  Shop {collection.name}
                  <ArrowRightIcon aria-hidden="true" className="size-4" />
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
