import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import CollectionHeading from "@/app/components/catalog/collection-heading";
import OpeningSoon from "@/app/components/catalog/opening-soon";
import Container from "@/app/components/container";
import { textLinkClass } from "@/app/components/form/styles";
import { formatCents } from "@/lib/cart/format";
import { buildListing, collectionHref, type FilterGroup, type Filters, type ListingCard } from "@/lib/catalog/listing";
import { productVariantPath } from "@/lib/catalog/product-detail";
import { getCollectionListing, listSwitcherCollections } from "@/lib/catalog/queries";
import type { SwitcherCollectionView } from "@/lib/catalog/types";
import { isCatalogEnabled } from "@/lib/flags";
import FilterSelects from "./filter-selects";

//  Canonical without ?type/?facet, so filtered views aren't indexed as
//  separate pages. The flag is checked here too: metadata renders separately
//  from the page, and would otherwise leak the collection name while the
//  catalog is off.
export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  if (!isCatalogEnabled()) return { title: "Shop | Cannan" };
  const { slug } = await params;
  const listing = await getCollectionListing(slug);
  if (!listing) return { title: "Not found | Cannan" };
  const { collection } = listing;
  return {
    title: `${collection.name} | Cannan`,
    description: collection.description,
    alternates: { canonical: `/collections/${collection.slug}` },
  };
}

//  One page per collection. An unknown slug and a collection with nothing
//  visible both 404 (the second isn't public yet, like a draft product).
//  Filters are plain links on desktop, so they work without JS; unknown
//  values fall back to All, and a valid but empty combination shows No results.
export default async function CollectionPage({ params, searchParams }: PageProps<"/collections/[slug]">) {
  if (!isCatalogEnabled()) return <OpeningSoon />;

  const { slug } = await params;
  const [listing, collections] = await Promise.all([getCollectionListing(slug), listSwitcherCollections()]);
  if (!listing) notFound();

  const { collection, products } = listing;
  const { type, facet } = await searchParams;
  const { filters, typeGroup, facetGroup, cards } = buildListing(collection, products, { type, facet });
  const groups = [
    ...(typeGroup ? [{ key: "type" as const, group: typeGroup }] : []),
    ...(facetGroup ? [{ key: "facet" as const, group: facetGroup }] : []),
  ];

  return (
    <Container className="pt-8 pb-16 md:pt-12 md:pb-24">
      <CollectionHeading title={collection.name} />
      <CollectionSwitcher collections={collections} current={collection.slug} />

      {cards.length === 0 ? (
        <div>
          <p className="mb-3 text-body-md text-stone">No pieces match these filters.</p>
          <Link href={collectionHref(collection.slug, { type: null, facet: null })} className={`text-body-md ${textLinkClass}`}>
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:gap-12">
          {groups.length > 0 && (
            <>
              <nav aria-label="Filters" className="hidden w-50 shrink-0 flex-col gap-8 md:flex">
                {groups.map(({ key, group }) => (
                  <FilterLinks key={key} groupKey={key} group={group} collectionSlug={collection.slug} filters={filters} />
                ))}
              </nav>
              <div className="mb-8 md:hidden">
                <FilterSelects collectionSlug={collection.slug} filters={filters} groups={groups} />
              </div>
            </>
          )}

          <ul className="grid flex-1 grid-cols-2 content-start gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-8 md:gap-y-12">
            {cards.map((card, index) => (
              <li key={card.slug}>
                <ProductCard product={card} eager={index < 3} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Container>
  );
}

//  Text links to each public collection. Switching collections drops the
//  filters: a type or facet from one rarely means anything in another.
function CollectionSwitcher({ collections, current }: { collections: SwitcherCollectionView[]; current: string }) {
  return (
    <nav aria-label="Collections" className="mb-6 md:mb-12">
      <ul className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-body-md md:gap-x-3">
        {collections.map(({ slug, name }, index) => (
          //  The separator lives in the item after it, so a wrapped line
          //  never starts with a dot.
          <li key={slug} className="flex items-center gap-x-2.5 md:gap-x-3">
            {index > 0 && (
              <span aria-hidden="true" className="text-stone">
                ·
              </span>
            )}
            <Link
              href={collectionHref(slug, { type: null, facet: null })}
              aria-current={slug === current ? "page" : undefined}
              className={filterLinkClass(slug === current)}
            >
              {name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function filterLinkClass(active: boolean) {
  return `text-body-md transition-colors ${active ? "text-charcoal underline underline-offset-4" : "text-stone hover:text-charcoal"}`;
}

//  One desktop filter group. Each link keeps the other group's selection;
//  "All" (slug null) drops this group's parameter.
function FilterLinks({
  groupKey,
  group,
  collectionSlug,
  filters,
}: {
  groupKey: keyof Filters;
  group: FilterGroup;
  collectionSlug: string;
  filters: Filters;
}) {
  const labelId = `filter-${groupKey}-label`;
  return (
    <div>
      <p id={labelId} className="mb-3 text-label-ui text-charcoal">
        {group.label}
      </p>
      <ul aria-labelledby={labelId} className="flex flex-col gap-2">
        {group.options.map((option) => {
          const active = option.slug === group.selected;
          return (
            <li key={option.slug ?? ""}>
              <Link
                href={collectionHref(collectionSlug, { ...filters, [groupKey]: option.slug })}
                aria-current={active ? "true" : undefined}
                className={filterLinkClass(active)}
              >
                {option.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

//  The whole card is one link; the name underlining is its only hover signal.
//  The tile is white to match the white-background product photos. Under a
//  color filter the link opens the product on that color's variant.
function ProductCard({ product, eager }: { product: ListingCard; eager: boolean }) {
  return (
    <Link href={productVariantPath(product.slug, product.variantId)} className="group flex flex-col">
      <div className="relative mb-3 aspect-square w-full bg-white md:mb-4">
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            fill
            loading={eager ? "eager" : "lazy"}
            sizes="(min-width: 1200px) 360px, (min-width: 768px) 33vw, 50vw"
            className="object-contain"
          />
        )}
      </div>
      <h2 className="mb-1 font-serif text-title-md text-charcoal underline-offset-4 group-hover:underline">
        {product.name}
      </h2>
      <p className="text-label-ui text-charcoal">
        {product.hasPriceRange ? "From " : ""}
        {formatCents(product.minPriceCents)}
      </p>
      {!product.inStock && <p className="mt-1 text-caption text-stone">Sold out</p>}
    </Link>
  );
}
