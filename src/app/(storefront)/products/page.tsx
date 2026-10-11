import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import Container from "@/app/components/container";
import { formatCents } from "@/lib/cart/format";
import {
  getDefaultCollection,
  listCategoriesInCollection,
  listProducts,
} from "@/lib/catalog/queries";
import type { ProductCardView } from "@/lib/catalog/types";
import { isCatalogEnabled } from "@/lib/flags";

export const metadata: Metadata = {
  title: "Products | CANNAN",
  description: "Meaningful pieces for every home and every tradition, curated by Cannan. For you and yours.",
};

//  Lists the default collection. Category filters are plain links to
//  ?category=<slug>, so filtering works without client JS. An unknown slug
//  falls back to "All" instead of a 404 or an empty grid.
export default async function Products({ searchParams }: PageProps<"/products">) {
  if (!isCatalogEnabled()) return <EmptyState />;

  const collection = await getDefaultCollection();
  if (!collection) return <EmptyState />;

  const { category } = await searchParams;
  const categories = await listCategoriesInCollection(collection.id);
  const activeSlug = categories.find((c) => c.slug === category)?.slug;

  const products = await listProducts({ collectionId: collection.id, categorySlug: activeSlug });
  if (products.length === 0) return <EmptyState />;
  
   return (
    <Container className="py-10">
      <h1 className="text-xl font-semibold">{collection.name}</h1>

      <div className="mt-6 flex flex-col gap-8 md:flex-row md:gap-12">
        {categories.length > 0 && (
          <nav aria-label="Categories" className="shrink-0 md:w-48">
            <ul className="flex flex-wrap gap-2 md:flex-col md:gap-1">
              <li>
                <FilterLink href="/products" active={!activeSlug}>
                  All
                </FilterLink>
              </li>
              {categories.map((c) => (
                <li key={c.slug}>
                  <FilterLink href={`/products?category=${encodeURIComponent(c.slug)}`} active={c.slug === activeSlug}>
                    {c.name}
                  </FilterLink>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <ul className="grid flex-1 grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.slug}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`block rounded px-3 py-1 text-sm ${active ? "bg-[#16191E] text-white" : "hover:bg-neutral-100"}`}
    >
      {children}
    </Link>
  );
}

function ProductCard({ product }: { product: ProductCardView }) {
  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col gap-2">
      <div className="relative aspect-square overflow-hidden rounded bg-white ">
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            fill
            loading="eager"
            sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 50vw"
            className="object-contain transition-transform group-hover:scale-105"
          />
        )}
        {!product.inStock && (
          <span className="absolute top-2 left-2 rounded bg-white/90 px-2 py-0.5 text-xs font-medium">
            Sold out
          </span>
        )}
      </div>
      <div>
        <p className="font-medium group-hover:underline">{product.name}</p>
        <p className="text-sm text-neutral-600">
          {product.hasPriceRange ? "From " : ""}
          {formatCents(product.minPriceCents)}
        </p>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <Container className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
      <h1 className="text-xl font-semibold">Products</h1>
      <p>Nothing here yet. Meaningful pieces for every home and every tradition are on the way.</p>
    </Container>
  );
}
