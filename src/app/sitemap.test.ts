import { beforeEach, describe, expect, it, vi } from 'vitest';

const catalogEnabled = vi.hoisted(() => ({ value: true }));

vi.mock('@/lib/flags', () => ({ isCatalogEnabled: () => catalogEnabled.value }));
vi.mock('@/lib/catalog/queries', () => ({
    listSwitcherCollections: vi.fn(async () => [{ slug: 'signature', name: 'Signature' }]),
    listSitemapProducts: vi.fn(async () => [{ slug: 'san-jose-statue', updatedAt: new Date('2026-10-01') }]),
}));

import { listSitemapProducts } from '@/lib/catalog/queries';
import sitemap from './sitemap';

beforeEach(() => {
    catalogEnabled.value = true;
    vi.mocked(listSitemapProducts).mockClear();
});

describe('sitemap', () => {
    it('lists collections and products on the www origin, with no parameters', async () => {
        const urls = (await sitemap()).map(({ url }) => url);
        expect(urls).toContain('https://www.shopcannan.com/collections/signature');
        expect(urls).toContain('https://www.shopcannan.com/products/san-jose-statue');
        expect(urls).toContain('https://www.shopcannan.com/myCANN');
        expect(urls.every((url) => url.startsWith('https://www.shopcannan.com/'))).toBe(true);
        expect(urls.some((url) => url.includes('?'))).toBe(false);
        expect(urls.some((url) => /\/(id|adm|api|cart|orders)(\/|$)/.test(url))).toBe(false);
    });

    it('has no catalog URLs, and reads nothing, with the catalog off', async () => {
        catalogEnabled.value = false;
        const urls = (await sitemap()).map(({ url }) => url);
        expect(urls.some((url) => /\/(collections|products)\//.test(url))).toBe(false);
        expect(listSitemapProducts).not.toHaveBeenCalled();
    });
});
