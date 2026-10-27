import type { MetadataRoute } from 'next';

import { absoluteUrl, SITE_ORIGIN } from '@/lib/seo/site';

/**
 * Keeps crawlers out of the admin and the API.
 *
 * Disallow only prevents crawling — a URL linked from elsewhere can still be
 * indexed without being fetched. Pages that must stay out of results set
 * `robots: { index: false }` instead (the /id pages, the myCANN dashboard),
 * and are left crawlable on purpose: a crawler that can't fetch a page never
 * sees its noindex.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/adm', '/api'],
        },
        host: SITE_ORIGIN,
        sitemap: absoluteUrl('/sitemap.xml'),
    };
}
