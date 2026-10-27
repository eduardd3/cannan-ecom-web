// lib/catalog/queries.ts
//
// Storefront reads. Only ACTIVE products with at least one active variant are
// visible: the same rule as isPurchasable in lib/cart/actions.ts, so nothing
// shown here fails when it's added to the cart.
import "server-only";

import { cache } from "react";

import type { Prisma } from "@/generated/prisma/client";
import { getImageUrl } from "@/lib/storage";
import { isCatalogEnabled } from "@/lib/flags";
import { prisma } from "@/lib/prisma";
import { formatDimensions } from "./format";
import { collectionHref, isGroupVisible, type ListingCollection, type ListingProduct } from "./listing";
import type {
  CollectionView,
  ProductCardView,
  ProductDetailView,
  SwitcherCollectionView,
} from "./types";

const visibleProduct = {
  status: "ACTIVE",
  variants: { some: { isActive: true } },
} satisfies Prisma.ProductWhereInput;

/**
 * Where /products sends shoppers: the default collection (a partial unique
 * index allows at most one) and its category slugs, so an old ?category= link
 * can carry over. Null when there's no default, or it has nothing visible yet
 * (the collection page would 404).
 */
export async function getDefaultCollectionTarget(): Promise<{ slug: string; categorySlugs: string[] } | null> {
  const collection = await prisma.collection.findFirst({
    where: { isDefault: true, products: { some: visibleProduct } },
    select: { slug: true, categories: { select: { slug: true } } },
  });
  if (!collection) return null;
  return { slug: collection.slug, categorySlugs: collection.categories.map((category) => category.slug) };
}

/**
 * Where "Shop" links go: the default collection itself, so they don't bounce
 * through the /products redirect. /products when the catalog is off or there's
 * no default to show, since it renders Opening soon then without redirecting.
 * Wrapped in cache() because the header and the page can both call it.
 */
export const getShopHref = cache(async (): Promise<string> => {
  if (!isCatalogEnabled()) return "/products";
  const target = await getDefaultCollectionTarget();
  return target ? collectionHref(target.slug, { type: null, facet: null }) : "/products";
});

/** Collections with at least one visible product, in switcher order. */
export async function listSwitcherCollections(): Promise<SwitcherCollectionView[]> {
  return prisma.collection.findMany({
    where: { products: { some: visibleProduct } },
    select: { slug: true, name: true },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });
}

/**
 * A collection and every visible product in it, newest first, for
 * lib/catalog/listing to filter. One fetch keeps the filters, prices, and
 * ordering consistent with each other. Null when the slug is unknown or the
 * collection has nothing visible: it isn't public yet, so the page 404s.
 * Wrapped in cache() because generateMetadata and the page both call it.
 */
export const getCollectionListing = cache(
  async (slug: string): Promise<{ collection: ListingCollection; products: ListingProduct[] } | null> => {
    const collection = await prisma.collection.findUnique({
      where: { slug },
      select: {
        slug: true,
        name: true,
        description: true,
        facetLabel: true,
        facetSource: true,
        products: {
          where: visibleProduct,
          select: {
            slug: true,
            name: true,
            option1Name: true,
            option2Name: true,
            productType: { select: { slug: true, name: true, position: true } },
            category: { select: { slug: true, name: true } },
            images: { select: { key: true, alt: true }, orderBy: [{ position: "asc" }, { id: "asc" }], take: 1 },
            variants: {
              where: { isActive: true },
              select: { id: true, priceCents: true, stock: true, option1Value: true, option2Value: true },
              orderBy: [{ position: "asc" }, { id: "asc" }],
            },
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        },
      },
    });
    if (!collection || collection.products.length === 0) return null;

    const { products, ...rest } = collection;
    return {
      collection: rest,
      products: products.map(({ images, ...product }) => ({
        ...product,
        imageUrl: images[0] ? getImageUrl(images[0].key) : null,
        imageAlt: images[0]?.alt ?? null,
      })),
    };
  },
);

// What a product card needs: the first image and the active variants' prices.
const productCardSelect = {
  slug: true,
  name: true,
  images: { select: { key: true, alt: true }, orderBy: { position: "asc" }, take: 1 },
  variants: { where: { isActive: true }, select: { priceCents: true, stock: true } },
} satisfies Prisma.ProductSelect;

function toProductCard(
  product: Prisma.ProductGetPayload<{ select: typeof productCardSelect }>,
): ProductCardView {
  const prices = product.variants.map((variant) => variant.priceCents);
  const image = product.images[0] ?? null;
  return {
    slug: product.slug,
    name: product.name,
    imageUrl: image ? getImageUrl(image.key) : null,
    imageAlt: image?.alt ?? null,
    minPriceCents: Math.min(...prices),
    hasPriceRange: new Set(prices).size > 1,
    inStock: product.variants.some((variant) => variant.stock > 0),
  };
}

const FEATURED_LIMIT = 8;

/**
 * The homepage's featured pieces: up to 8 visible products, featured ones
 * first, topped up with the newest when fewer than 8 are featured. One query:
 * sorting on featured before createdAt does both.
 */
export async function listFeaturedProducts(): Promise<ProductCardView[]> {
  const products = await prisma.product.findMany({
    where: visibleProduct,
    select: productCardSelect,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: FEATURED_LIMIT,
  });
  return products.map(toProductCard);
}

/** Every collection, in its admin-set order, for the homepage grid. */
export async function listCollections(): Promise<CollectionView[]> {
  return prisma.collection.findMany({
    select: { slug: true, name: true, description: true },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });
}

/**
 * One product for its detail page, or null when it's missing or not visible
 * (the page 404s either way). Wrapped in cache() because generateMetadata and
 * the page both call it during one request.
 */
export const getProductBySlug = cache(async (slug: string): Promise<ProductDetailView | null> => {
  const product = await prisma.product.findFirst({
    where: { ...visibleProduct, slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      material: true,
      brand: true,
      isFinalSale: true,
      collection: {
        select: {
          slug: true,
          name: true,
          facetLabel: true,
          facetSource: true,
          // One row per type among the collection's visible products: the
          // breadcrumb links to a type only when the Type filter shows.
          products: {
            where: visibleProduct,
            select: { productType: { select: { slug: true, name: true } } },
            distinct: ["productTypeId"],
          },
        },
      },
      productType: { select: { slug: true, name: true } },
      category: { select: { slug: true, name: true } },
      option1Name: true,
      option2Name: true,
      images: {
        select: { key: true, alt: true, variantId: true },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      },
      variants: {
        where: { isActive: true },
        select: {
          id: true,
          sku: true,
          gtin: true,
          option1Value: true,
          option2Value: true,
          priceCents: true,
          stock: true,
          heightIn: true,
          widthIn: true,
          depthIn: true,
        },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      },
    },
  });
  if (!product) return null;

  const { products: typed, ...collection } = product.collection;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    material: product.material,
    brand: product.brand,
    isFinalSale: product.isFinalSale,
    collection: {
      ...collection,
      typeFilterVisible: isGroupVisible(
        typed.map(({ productType }) => productType),
        null,
      ),
    },
    productType: product.productType,
    category: product.category,
    option1Name: product.option1Name,
    option2Name: product.option2Name,
    images: product.images.map((image) => ({
      url: getImageUrl(image.key),
      alt: image.alt,
      variantId: image.variantId,
    })),
    // Formatted here so no Decimal reaches the client component.
    variants: product.variants.map(({ heightIn, widthIn, depthIn, ...variant }) => ({
      ...variant,
      dimensions: formatDimensions({ heightIn, widthIn, depthIn }),
    })),
  };
});

/**
 * The current slug for a product's OLD slug, so the detail page can redirect
 * a renamed product's indexed URL. Null when the slug was never a product's,
 * or the product isn't visible (the page 404s, as it would for the product).
 */
export async function getRedirectedSlug(oldSlug: string): Promise<string | null> {
  const redirect = await prisma.productSlugRedirect.findUnique({
    where: { slug: oldSlug },
    select: {
      product: {
        select: {
          slug: true,
          status: true,
          variants: { where: { isActive: true }, select: { id: true }, take: 1 },
        },
      },
    },
  });
  const product = redirect?.product;
  if (!product || product.status !== visibleProduct.status || product.variants.length === 0) return null;
  return product.slug;
}

/** Every visible product's slug and last edit, for the sitemap. */
export async function listSitemapProducts(): Promise<{ slug: string; updatedAt: Date }[]> {
  return prisma.product.findMany({
    where: visibleProduct,
    select: { slug: true, updatedAt: true },
    orderBy: { id: "asc" },
  });
}
