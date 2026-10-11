// lib/images.ts
//
// ProductImage rows store a storage key ("products/<slug>/1.jpg"), never a
// URL. This is the one place a key becomes a URL, so moving image hosting is
// an env change, not a data migration.
//
// IMAGE_BASE_URL unset → the dev seed images committed under
// public/seed-images/. Once images live in S3, set it to the CloudFront
// origin (and add that host to images.remotePatterns in next.config.ts).
//
// The seed-images prefix matters: public/ is served from the site root, so
// public/products/... would share URLs with the /products/[slug] route.
//
// Called on the server only; components receive finished URLs as props, so
// the variable doesn't need a NEXT_PUBLIC_ prefix.
const DEFAULT_BASE_URL = "/seed-images";

export function getImageUrl(key: string): string {
  const base = (process.env.IMAGE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  return `${base}/${key.replace(/^\/+/, "")}`;
}
