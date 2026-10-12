// lib/catalog/queries.ts
//
// Storefront reads. Only ACTIVE products with at least one active variant are
// visible: the same rule as isPurchasable in lib/cart/actions.ts, so nothing
// shown here fails when it's added to the cart.
import "server-only";

import { cache } from "react";

import type { Prisma } from "@/generated/prisma/client";
import { getImageUrl } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import type {
  CategoryView,
  ProductCardView,
  ProductDetailView,
} from "./types";

const visibleProduct = {
  status: "ACTIVE",
  variants: { some: { isActive: true } },
} satisfies Prisma.ProductWhereInput;

/**
 * The collection the storefront lists. A partial unique index allows at most
 * one; null only if someone unset it.
 */
export async function getDefaultCollection() {
  return prisma.collection.findFirst({
    where: { isDefault: true },
    select: { id: true, name: true, description: true },
  });
}

/**
 * Categories with at least one visible product in the collection, so no
 * filter leads to an empty grid.
 */
export async function listCategoriesInCollection(collectionId: number): Promise<CategoryView[]> {
  return prisma.category.findMany({
    where: { products: { some: { product: { ...visibleProduct, collectionId } } } },
    select: { slug: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function listProducts({
  collectionId,
  categorySlug,
}: {
  collectionId: number;
  categorySlug?: string;
}): Promise<ProductCardView[]> {
  const products = await prisma.product.findMany({
    where: {
      ...visibleProduct,
      collectionId,
      ...(categorySlug && { categories: { some: { category: { slug: categorySlug } } } }),
    },
    select: {
      slug: true,
      name: true,
      images: { select: { key: true, alt: true }, orderBy: { position: "asc" }, take: 1 },
      variants: { where: { isActive: true }, select: { priceCents: true, stock: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  return products.map((product) => {
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
      slug: true,
      name: true,
      description: true,
      images: {
        select: { key: true, alt: true, variantId: true },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      },
      variants: {
        where: { isActive: true },
        select: { id: true, name: true, value: true, priceCents: true, stock: true },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      },
    },
  });
  if (!product) return null;

  return {
    slug: product.slug,
    name: product.name,
    description: product.description,
    images: product.images.map((image) => ({
      url: getImageUrl(image.key),
      alt: image.alt,
      variantId: image.variantId,
    })),
    variants: product.variants,
  };
});
