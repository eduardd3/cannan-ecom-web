import Container from "@/app/components/container";
import type { ProductCardView } from "@/lib/catalog/types";
import FeaturedRail from "./featured-rail";

//  Server Component: the heading and data. The rail (scrolling, arrows,
//  counter, gold progress line) is the client part, in featured-rail.tsx.
export default function FeaturedProducts({ products }: { products: ProductCardView[] }) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="featured-heading">
      <Container className="py-16 md:py-24">
        <FeaturedRail
          products={products}
          heading={
            <div>
              <p className="mb-2 text-label-eyebrow text-gold-ink uppercase">Curated essentials</p>
              <h2 id="featured-heading" className="font-serif text-headline-lg text-charcoal">
                Featured pieces <span lang="es" className="font-normal italic">· Obras selectas</span>
              </h2>
              {/* Matches what listFeaturedProducts returns: featured pieces
                  first, topped up with the newest. TODO(copy). */}
              <p className="mt-2.5 text-body-lg text-stone">Favorites from across the shop, and what&apos;s new.</p>
            </div>
          }
        />
      </Container>
    </section>
  );
}
