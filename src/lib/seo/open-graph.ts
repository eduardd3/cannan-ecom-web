// lib/seo/open-graph.ts
//
// A page's openGraph replaces the layout's entirely (Next merges metadata
// shallowly), so every page builds it here and none forgets siteName, locale,
// or the canonical url.

import type { Metadata } from "next";

import { SITE_NAME } from "./site";

type OpenGraphImage = { url: string; alt: string };

/**
 * path is the page's canonical path: never ?variant=, ?type= or ?facet=, so
 * shares of a filtered or preselected URL credit the indexed page.
 */
export function buildOpenGraph({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description?: string;
  path: string;
  image?: OpenGraphImage | null;
}): NonNullable<Metadata["openGraph"]> {
  if (path.includes("?")) throw new Error(`buildOpenGraph: path must be canonical, got "${path}"`);
  return {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: path,
    title,
    ...(description !== undefined && { description }),
    ...(image && { images: [image] }),
  };
}
