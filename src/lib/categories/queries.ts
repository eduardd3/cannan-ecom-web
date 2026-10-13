// lib/categories/queries.ts
//
// Admin READ side for categories. Callers check requireStaff() first.
import "server-only";

import { prisma } from "@/lib/prisma";

// No pagination; there are only a handful of categories.
export async function listAdminCategories() {
  const categories = await prisma.category.findMany({
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
  });
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    productCount: category._count.products,
  }));
}

export async function getAdminCategory(categoryId: number) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      createdAt: true,
      products: {
        orderBy: { product: { name: "asc" } },
        select: { product: { select: { id: true, name: true, status: true } } },
      },
    },
  });
  if (!category) return null;
  return { ...category, products: category.products.map((link) => link.product) };
}
