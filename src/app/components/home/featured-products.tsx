import Image from "next/image";
import Link from "next/link";

import Container from "@/app/components/container";
import { formatCents } from "@/lib/cart/format";
import type { ProductCardView } from "@/lib/catalog/types";

export default function FeaturedProducts({ products }: { products: ProductCardView[] }) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="featured-heading">
      <Container className="py-16 md:py-24">
        <div className="mb-16 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-label-eyebrow text-gold-ink uppercase">Curated essentials</p>
            <h2 id="featured-heading" className="font-serif text-headline-lg text-charcoal">
              Featured Pieces <span lang="es" className="font-normal italic">· Obras selectas</span>
            </h2>
          </div>
          {/* TODO(copy): short line beside the featured heading. */}
          <p className="max-w-105 text-body-md text-stone">
            [Featured: one line on how these pieces were chosen]
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 md:gap-x-6">
          {products.map((product) => (
            <li key={product.slug}>
              <FeaturedCard product={product} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

//  Same data and price format as the /products cards; styled after the
//  homepage design. The hover zoom is CSS only (group-hover).
function FeaturedCard({ product }: { product: ProductCardView }) {
  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col">
      <div className="relative mb-4 aspect-4/5 w-full overflow-hidden bg-white">
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            fill
            sizes="(min-width: 1200px) 285px, (min-width: 768px) 25vw, 50vw"
            className="object-contain transition-transform duration-500 ease-out group-hover:scale-105"
          />
        )}
        {!product.inStock && (
          <span className="absolute top-2 left-2 bg-gallery-white/90 px-2 py-0.5 text-caption text-charcoal">
            Sold out
          </span>
        )}
      </div>
      <p className="mb-1 text-label-ui text-charcoal group-hover:underline">{product.name}</p>
      <p className="text-caption text-stone">
        {product.hasPriceRange ? "From " : ""}
        {formatCents(product.minPriceCents)}
      </p>
    </Link>
  );
}
