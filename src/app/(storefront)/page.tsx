import type { Metadata } from "next";

import CollectionsGrid from "@/app/components/home/collections-grid";
import FeaturedProducts from "@/app/components/home/featured-products";
import Hero from "@/app/components/home/hero";
import Narrative from "@/app/components/home/narrative";
import Promises from "@/app/components/home/promises";
import { listCollections, listFeaturedProducts } from "@/lib/catalog/queries";
import { isCatalogEnabled } from "@/lib/flags";

const TITLE = "Cannan | Saint, Orisha & Santa Muerte Devotional Goods";
// TODO(copy): homepage meta description.
const DESCRIPTION =
  "Statues, figurines, framed wall art, and more, honoring saints, Orishas, and Santa Muerte. Chosen with care in California. Para ti y los tuyos.";

//  Homepage. Served at "/" directly — no redirect hop.
//
//  Brand first only here: brand searches are this page's main job. absolute
//  keeps the title as written if the root layout ever gains a title template.
//  Canonical is set on this page only; in the layout it would make every page
//  canonicalize to home. openGraph merges shallowly (a page's object replaces
//  the parent's), so siteName lives here, not in the layout.
export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Cannan",
    title: TITLE,
    description: DESCRIPTION,
    // TODO: OG image, likely a generated opengraph-image.tsx (ImageResponse).
  },
};

//  Tells Google which site name to show above the URL; alternateName gives it
//  fallbacks if "Cannan" alone isn't treated as unique.
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Cannan",
  alternateName: ["Shop Cannan", "shopcannan.com"],
  url: "https://www.shopcannan.com/",
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
      <script
        type="application/ld+json"
        //  Escaping < keeps any string in the data from closing the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }}
      />
      <Hero />
      <CollectionsGrid collections={collections} />
      <FeaturedProducts products={featured} />
      <Narrative />
      <Promises />
    </>
  );
}
