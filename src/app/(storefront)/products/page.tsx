import type { Metadata } from "next";
import { redirect } from "next/navigation";

import OpeningSoon from "@/app/components/catalog/opening-soon";
import { collectionHref } from "@/lib/catalog/listing";
import { getDefaultCollectionTarget } from "@/lib/catalog/queries";
import { isCatalogEnabled } from "@/lib/flags";

export const metadata: Metadata = {
  title: "Shop | Cannan",
};

//  "Shop" in the header links here, so nothing hardcodes a collection.
//  Redirects to the default collection with a 307, not a 308: the default can
//  change in the admin, and browsers cache permanent redirects. An old
//  ?category=<slug> carries over as ?facet= when it's one of that
//  collection's categories. Catalog off, or no default with anything visible:
//  Opening soon, with no redirect (and, flag off, no database read).
export default async function Products({ searchParams }: PageProps<"/products">) {
  if (!isCatalogEnabled()) return <OpeningSoon />;

  const target = await getDefaultCollectionTarget();
  if (!target) return <OpeningSoon />;

  const { category } = await searchParams;
  const facet = typeof category === "string" && target.categorySlugs.includes(category) ? category : null;
  redirect(collectionHref(target.slug, { type: null, facet }));
}
