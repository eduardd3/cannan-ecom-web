import type { MetadataRoute } from 'next';

import { collectionHref } from '@/lib/catalog/listing';
import { listSitemapProducts, listSwitcherCollections } from '@/lib/catalog/queries';
import { isCatalogEnabled } from '@/lib/flags';
import { productPath } from '@/lib/products/slug';
import { absoluteUrl } from '@/lib/seo/site';

//  Indexable pages only: /adm and /api are blocked in robots.ts, /id/* and
//  /myCANN/dashboard are noindex, and /cart and /orders are per-customer.
//  /products is left out because it only redirects to the default collection.
const STATIC_PATHS = ['/', '/about', '/contact', '/shipping', '/returns', '/terms', '/privacy', '/myCANN'];

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
    const pages: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({ url: absoluteUrl(path) }));
    if (!isCatalogEnabled()) return pages;

    const [collections, products] = await Promise.all([listSwitcherCollections(), listSitemapProducts()]);
    return [
        ...pages,
        ...collections.map(({ slug }) => ({ url: absoluteUrl(collectionHref(slug, { type: null, facet: null })) })),
        ...products.map(({ slug, updatedAt }) => ({ url: absoluteUrl(productPath(slug)), lastModified: updatedAt })),
    ];
}
