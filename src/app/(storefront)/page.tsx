import type { Metadata } from "next";

import CollectionsGrid from "@/app/components/home/collections-grid";
import FeaturedProducts from "@/app/components/home/featured-products";
import Hero from "@/app/components/home/hero";
import Narrative from "@/app/components/home/narrative";
import Promises from "@/app/components/home/promises";
import { listCollections, listFeaturedProducts } from "@/lib/catalog/queries";
import { isCatalogEnabled } from "@/lib/flags";

//  Homepage. Served at "/" directly — no redirect hop.
export const metadata: Metadata = {
  title: "Cannan | Official Online Store",
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
      <Hero />
      <CollectionsGrid collections={collections} />
      <FeaturedProducts products={featured} />
      <Narrative />
      <Promises />
    </>
  );
}
