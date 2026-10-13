// lib/products/slug.ts
//
// Pure slug rules. No server imports: the product form (a client component)
// previews slugs as the name is typed, and the server validates with the same
// functions.

export const MAX_SLUG_LENGTH = 80;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A URL slug from a product name: accents removed ("Señora" → "senora"),
 * lowercase, runs of anything else collapsed to one hyphen. May return ""
 * for a name with no letters or digits.
 */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // combining accents left by NFD
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // Cut at a hyphen when possible so the slug doesn't end mid-word.
  if (slug.length <= MAX_SLUG_LENGTH) return slug;
  const cut = slug.slice(0, MAX_SLUG_LENGTH);
  const lastHyphen = cut.lastIndexOf("-");
  return (lastHyphen > 0 ? cut.slice(0, lastHyphen) : cut).replace(/-+$/, "");
}

/** Why a typed slug can't be used, or null if it can. */
export function slugProblem(slug: string): string | null {
  if (slug.length === 0) return "Enter a URL slug.";
  if (slug.length > MAX_SLUG_LENGTH) return `Keep the slug to ${MAX_SLUG_LENGTH} characters or fewer.`;
  if (!SLUG_PATTERN.test(slug)) {
    return "Use lowercase letters, digits, and single hyphens between words.";
  }
  return null;
}

export function productPath(slug: string): string {
  return `/products/${slug}`;
}
