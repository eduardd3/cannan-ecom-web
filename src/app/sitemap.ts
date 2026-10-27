import type { MetadataRoute } from 'next';

import { collectionHref } from '@/lib/catalog/listing';
import { listSitemapProducts, listSwitcherCollections } from '@/lib/catalog/queries';
import { isCatalogEnabled } from '@/lib/flags';
import { productPath } from '@/lib/products/slug';

const ORIGIN = 'https://www.shopcannan.com';

//  Public pages only: robots.ts keeps crawlers out of /adm, /id, /myCANN and
//  /api, and /cart and /orders are per-customer. /products is left out because
//  it only redirects to the default collection.
const STATIC_PATHS = ['/', '/about', '/contact', '/shipping', '/returns', '/terms', '/privacy'];

//  Rendered per request, like the catalog pages: a build-time sitemap would
//  freeze the product list until the next deploy, and the build would need
//  the database.
export const dynamic = 'force-dynamic';

/**
 * Collections and products appear only when their pages would render: with
 * the catalog on, and with at least one visible product (the same queries the
 * pages use). Catalog off, no database read at all.
 *
 * No lastModified on static pages: a date that changes on every request
 * tells crawlers nothing.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const pages: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({ url: `${ORIGIN}${path}` }));
    if (!isCatalogEnabled()) return pages;

    const [collections, products] = await Promise.all([listSwitcherCollections(), listSitemapProducts()]);
    return [
        ...pages,
        ...collections.map(({ slug }) => ({ url: `${ORIGIN}${collectionHref(slug, { type: null, facet: null })}` })),
        ...products.map(({ slug, updatedAt }) => ({ url: `${ORIGIN}${productPath(slug)}`, lastModified: updatedAt })),
    ];
}
