// lib/products/queries.ts
//
// Admin READ side for products. Callers check requireStaff() first.
import "server-only";

import type { ProductStatus } from "@/generated/prisma/client";

import { formatVariantLabel } from "@/lib/catalog/format";
import { prisma } from "@/lib/prisma";
import { getImageUrl } from "@/lib/storage";

// No pagination yet; the catalog is small.
export async function listAdminProducts(status: ProductStatus | null) {
  const [products, counts] = await Promise.all([
    prisma.product.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        updatedAt: true,
        collection: { select: { name: true } },
        variants: { select: { isActive: true, stock: true } },
      },
    }),
    prisma.product.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countByStatus = new Map(counts.map((row) => [row.status, row._count._all]));
  return {
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      status: product.status,
      updatedAt: product.updatedAt,
      collectionName: product.collection.name,
      variantCount: product.variants.length,
      activeVariantCount: product.variants.filter((variant) => variant.isActive).length,
      totalStock: product.variants.reduce((sum, variant) => sum + variant.stock, 0),
    })),
    countByStatus,
    total: counts.reduce((sum, row) => sum + row._count._all, 0),
  };
}

export async function getAdminProduct(productId: number) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      status: true,
      featured: true,
      publishedAt: true,
      collectionId: true,
      productTypeId: true,
      categoryId: true,
      option1Name: true,
      option2Name: true,
      createdAt: true,
      updatedAt: true,
      slugRedirects: { select: { slug: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      // Same order as the storefront.
      images: {
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: { id: true, key: true, alt: true, variantId: true },
      },
      variants: {
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: {
          id: true,
          sku: true,
          option1Value: true,
          option2Value: true,
          priceCents: true,
          stock: true,
          isActive: true,
          amazonAsin: true,
          position: true,
        },
      },
    },
  });
  if (!product) return null;

  return {
    ...product,
    variants: product.variants.map((variant) => ({ ...variant, label: formatVariantLabel(variant) })),
    images: product.images.map(({ key, ...image }) => ({ ...image, url: getImageUrl(key) })),
  };
}

export type AdminProduct = NonNullable<Awaited<ReturnType<typeof getAdminProduct>>>;

/** What the product form's collection, type, and category pickers offer. */
export async function getProductFormOptions() {
  const [collections, productTypes, categories] = await Promise.all([
    prisma.collection.findMany({
      orderBy: [{ position: "asc" }, { id: "asc" }],
      select: { id: true, name: true, isDefault: true, facetLabel: true },
    }),
    prisma.productType.findMany({ orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true, name: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, collectionId: true } }),
  ]);
  return { collections, productTypes, categories };
}

export type ProductFormOptions = Awaited<ReturnType<typeof getProductFormOptions>>;
