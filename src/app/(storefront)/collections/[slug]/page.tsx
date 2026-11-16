import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import CollectionHeading from "@/app/components/catalog/collection-heading";
import OpeningSoon from "@/app/components/catalog/opening-soon";
import Container from "@/app/components/container";
import { textLinkClass } from "@/app/components/form/styles";
import { formatCents } from "@/lib/cart/format";
import {
  buildListing,
  collectionHref,
  type FilterGroup,
  type Filters,
  type ListingCard,
  type ListingState,
} from "@/lib/catalog/listing";
import { productVariantPath } from "@/lib/catalog/product-detail";
import { getCollectionListing, listSwitcherCollections } from "@/lib/catalog/queries";
import { SORT_OPTIONS } from "@/lib/catalog/sorting";
import type { SwitcherCollectionView } from "@/lib/catalog/types";
import { isCatalogEnabled } from "@/lib/flags";
import { buildOpenGraph } from "@/lib/seo/open-graph";
import MobileRows, { type MobileRow } from "./mobile-rows";
import OptionLinks, { optionLinkClass, type OptionLink } from "./option-links";
import PageControls from "./page-controls";
import SortMenu from "./sort-menu";

//  Canonical and og:url: each page of the plain list (no filters, default
//  sort) points to itself from page 2 on, so Google can discover pieces on
//  later pages. Everything else points to the bare collection, so filter and
//  sort combinations aren't indexed. Metadata never redirects a page past the
//  end; only the page does. The flag is checked here too: metadata renders
//  separately from the page, and would otherwise leak the collection name
//  while the catalog is off. The share image is the first one the default
//  grid shows.
export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/collections/[slug]">): Promise<Metadata> {
  if (!isCatalogEnabled()) return { title: "Shop | Cannan" };
  const { slug } = await params;
  const listing = await getCollectionListing(slug);
  if (!listing) return { title: "Not found | Cannan" };
  const { collection, products } = listing;
  const { type, facet, sort, page } = await searchParams;
  const { filters } = buildListing(collection, products, { type, facet, sort, page });
  const plainList = filters.type === null && filters.facet === null && filters.sort === "featured";
  const path = collectionHref(collection.slug, { type: null, facet: null, page: plainList ? filters.page : 1 });
  const card = buildListing(collection, products, {}).cards.find((card) => card.imageUrl !== null);
  return {
    title: filters.page > 1 ? `${collection.name} · Page ${filters.page} | Cannan` : `${collection.name} | Cannan`,
    description: collection.description,
    alternates: { canonical: path },
    openGraph: buildOpenGraph({
      title: collection.name,
      description: collection.description,
      path,
      image: card?.imageUrl ? { url: card.imageUrl, alt: card.imageAlt ?? card.name } : null,
    }),
    twitter: { card: "summary_large_image" },
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
  const { type, facet, sort, page } = await searchParams;
  const { filters, typeGroup, facetGroup, cards, total, totalPages } = buildListing(collection, products, {
    type,
    facet,
    sort,
    page,
  });

  // TODO(Lalo): L5
  // A page past the end (filters.page > totalPages) gets a temporary redirect
  // to the last page's collectionHref, keeping the filters and sort. Here,
  // after buildListing and before rendering; generateMetadata never redirects.

  const groups = [
    ...(typeGroup ? [{ key: "type" as const, group: typeGroup }] : []),
    ...(facetGroup ? [{ key: "facet" as const, group: facetGroup }] : []),
  ];
  const currentSort = SORT_OPTIONS.find((option) => option.key === filters.sort) ?? SORT_OPTIONS[0];
  const sortLinks = sortOptionLinks(collection.slug, filters);
  const mobileRows: MobileRow[] = [
    ...groups.map(({ key, group }) => {
      const selected = group.options.find((option) => option.slug === group.selected);
      return {
        key,
        label: group.label,
        value: selected?.name ?? "All",
        chosen: group.selected !== null,
        options: filterOptionLinks(collection.slug, filters, key, group),
      };
    }),
    { key: "sort", label: "Sort by", value: currentSort.label, chosen: filters.sort !== "featured", options: sortLinks },
  ];
  const count = `${total.toLocaleString("en-US")} ${total === 1 ? "piece" : "pieces"}`;

  return (
    <Container className="pt-8 pb-16 md:pt-12 md:pb-24">
      <CollectionHeading title={collection.name} />
      <CollectionSwitcher collections={collections} current={collection.slug} />

      {total === 0 ? (
        <div>
          <p className="mb-3 text-body-md text-stone">No pieces match these filters.</p>
          <Link href={collectionHref(collection.slug, { type: null, facet: null })} className={`text-body-md ${textLinkClass}`}>
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:gap-12">
          {groups.length > 0 && (
            <nav aria-label="Filters" className="hidden w-50 shrink-0 flex-col gap-8 md:flex">
              {groups.map(({ key, group }) => (
                <FilterGroupLinks
                  key={key}
                  groupKey={key}
                  label={group.label}
                  options={filterOptionLinks(collection.slug, filters, key, group)}
                />
              ))}
            </nav>
          )}
          <MobileRows rows={mobileRows} />

          <div className="min-w-0 flex-1">
            <div className="mb-8 hidden items-center justify-between gap-6 md:flex">
              <p className="text-body-md text-stone">{count}</p>
              <SortMenu currentLabel={currentSort.label} isDefault={filters.sort === "featured"} options={sortLinks} />
            </div>
            <p className="mb-4 text-caption text-stone md:hidden">{count}</p>

            {/* scroll-margin: the sticky header (64px + 1px border, 72px + 1px
                from md) plus 16px, so page links don't land the first row
                under it. */}
            <ul
              id="pieces"
              className="grid scroll-mt-[81px] grid-cols-2 content-start gap-x-4 gap-y-8 md:scroll-mt-[89px] md:grid-cols-3 md:gap-x-8 md:gap-y-12"
            >
              {cards.map((card, index) => (
                <li key={card.slug}>
                  <ProductCard product={card} eager={index < 3} />
                </li>
              ))}
            </ul>

            <PageControls collectionSlug={collection.slug} filters={filters} totalPages={totalPages} />
          </div>
        </div>
      )}
    </Container>
  );
}

//  A filter group's links. Each keeps the other group's selection and the
//  sort, and goes back to page 1; "All" (slug null) drops this group's
//  parameter. No hash: the shopper stays where the choice was made.
function filterOptionLinks(
  collectionSlug: string,
  filters: ListingState,
  groupKey: keyof Filters,
  group: FilterGroup,
): OptionLink[] {
  return group.options.map((option) => ({
    key: option.slug ?? "",
    label: option.name,
    href: collectionHref(collectionSlug, { ...filters, [groupKey]: option.slug, page: 1 }),
    active: option.slug === group.selected,
  }));
}

//  The sort links. Each keeps the filters and goes back to page 1.
function sortOptionLinks(collectionSlug: string, filters: ListingState): OptionLink[] {
  return SORT_OPTIONS.map((option) => ({
    key: option.key,
    label: option.label,
    href: collectionHref(collectionSlug, { type: filters.type, facet: filters.facet, sort: option.key }),
    active: option.key === filters.sort,
  }));
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
              className={optionLinkClass(slug === current)}
            >
              {name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

//  One desktop filter group: its label, then its links (folding past 8).
function FilterGroupLinks({ groupKey, label, options }: { groupKey: keyof Filters; label: string; options: OptionLink[] }) {
  const labelId = `filter-${groupKey}-label`;
  return (
    <div>
      <p id={labelId} className="mb-3 text-label-ui text-charcoal">
        {label}
      </p>
      <OptionLinks options={options} variant="sidebar" labelledBy={labelId} />
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
