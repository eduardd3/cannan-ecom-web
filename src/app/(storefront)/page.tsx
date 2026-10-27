import type { Metadata } from "next";

import CollectionsGrid from "@/app/components/home/collections-grid";
import FeaturedProducts from "@/app/components/home/featured-products";
import Hero from "@/app/components/home/hero";
import JsonLd from "@/app/components/json-ld";
import Narrative from "@/app/components/home/narrative";
import Promises from "@/app/components/home/promises";
import { listCollections, listFeaturedProducts } from "@/lib/catalog/queries";
import { isCatalogEnabled } from "@/lib/flags";
import { buildOpenGraph } from "@/lib/seo/open-graph";
import { buildHomeJsonLd } from "@/lib/seo/organization";

const TITLE = "Cannan | Saint, Orisha & Santa Muerte Devotional Goods";
// TODO(copy): homepage meta description.
const DESCRIPTION =
  "Statues, figurines, framed wall art, and more, honoring saints, Orishas, and Santa Muerte. Chosen with care in California. Para ti y los tuyos.";

//  Homepage. Served at "/" directly — no redirect hop.
//
//  Brand first only here: brand searches are this page's main job. absolute
//  keeps the title as written if the root layout ever gains a title template.
//  Canonical is set on this page only; in the layout it would make every page
//  canonicalize to home.
export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  // TODO: OG image, likely a generated opengraph-image.tsx (ImageResponse).
  openGraph: buildOpenGraph({ title: TITLE, description: DESCRIPTION, path: "/" }),
};

//  no HTML, body, or main -> outlined in Layout.tsx
//
//  Each section wraps its own content in Container rather than the page
//  wrapping them all: the narrative band's linen background runs full width.
//
//  The two catalog queries run here, in parallel, and the sections only
//  render what they're given. With CATALOG_ENABLED off, both are skipped
//  (no database hit), since their links would lead to an empty /products
//  and 404ing product pages.
export default async function Home() {
  const [collections, featured] = isCatalogEnabled()
    ? await Promise.all([listCollections(), listFeaturedProducts()])
    : [[], []];

  return (
    <>
      {/* The site name Google shows, and the site-wide shipping and returns. */}
      <JsonLd data={buildHomeJsonLd()} />
      <Hero />
      <CollectionsGrid collections={collections} />
      <FeaturedProducts products={featured} />
      <Narrative />
      <Promises />
    </>
  );
}
