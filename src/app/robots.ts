import type { MetadataRoute } from 'next';

/**
 * Keeps crawlers out of the authenticated areas.
 *
 * Disallow only prevents crawling — a URL linked from elsewhere can still be
 * indexed without being fetched. Pages that must stay out of results also set
 * `robots: { index: false }` in their metadata, which is what actually
 * excludes them.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/adm', '/id', '/myCANN', '/api'],
        },
        host: 'https://www.shopcannan.com',
    };
}
