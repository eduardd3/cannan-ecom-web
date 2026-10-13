// lib/categories/format.ts
//
// Pure limits shared by the category form (client) and the server actions.

export const MAX_CATEGORY_NAME_LENGTH = 60;
export const MAX_CATEGORY_DESCRIPTION_LENGTH = 1_000;

/** Where the storefront filters by a category. */
export function categoryFilterPath(slug: string): string {
  return `/products?category=${slug}`;
}
