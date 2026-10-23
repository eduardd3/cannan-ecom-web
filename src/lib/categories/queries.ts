// lib/categories/queries.ts
//
// Admin READ side for categories. Callers check requireStaff() first.
import "server-only";

import { prisma } from "@/lib/prisma";

// No pagination; there are only a handful of categories.
export async function listAdminCategories() {
  const categories = await prisma.category.findMany({
    orderBy: [{ collection: { position: "asc" } }, { name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      collection: { select: { name: true } },
      _count: { select: { products: true } },
    },
  });
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    collectionName: category.collection.name,
    productCount: category._count.products,
  }));
}

/** What the add form's collection picker offers: those whose facet is a category. */
export async function listCategoryCollections() {
  return prisma.collection.findMany({
    where: { facetSource: "CATEGORY" },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { id: true, name: true, isDefault: true },
  });
}

export async function getAdminCategory(categoryId: number) {
  return prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      createdAt: true,
      collectionId: true,
      collection: { select: { name: true } },
      products: { orderBy: { name: "asc" }, select: { id: true, name: true, status: true } },
    },
  });
}
