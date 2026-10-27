// lib/categories/format.ts
//
// Pure limits shared by the category form (client) and the server actions.

export const MAX_CATEGORY_NAME_LENGTH = 60;
export const MAX_CATEGORY_DESCRIPTION_LENGTH = 1_000;

/**
 * Where the storefront filters by a category: its own collection's page, so
 * the link works whichever collection is the default. Not collectionHref,
 * which would percent-encode the form's "…" placeholder.
 */
export function categoryFilterPath(collectionSlug: string, slug: string): string {
  return `/collections/${collectionSlug}?facet=${slug}`;
}
