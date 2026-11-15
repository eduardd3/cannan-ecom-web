// lib/feed/queries.ts
//
// Step 2. The feed's one database read. Same visibility rule as the
// storefront (ACTIVE, with at least one active variant), so the feed never
// lists a product whose page would 404.
import "server-only";
import type { FeedProductView } from "./types";
import { prisma } from "@/lib/prisma";
import { formatDimensions } from "@/lib/catalog/format";
import {visibleProduct} from "@/lib/catalog/queries"; 
import { getImageUrl } from "../storage";
/**
 * Every visible product, with its active variants and images in position
 * order, as FeedProductView.
 *
 * - visibleProduct is the storefront's own rule, imported rather than copied,
 *   so the feed and the pages can't disagree about what's public.
 * - Selects what getProductBySlug does, minus `collection` (its nested
 *   products query would run once per product). Keep the two in step.
 * - Images go through getImageUrl and dimensions through formatDimensions,
 *   so no Prisma Decimal leaves this file.
 * - Ordered by id, so the file comes out in the same order every day (easier
 *   to diff when something looks wrong).
 */
export async function getFeedProducts(): Promise<FeedProductView[]> {
  const products = await prisma.product.findMany({
      where: visibleProduct,
      select: { 
        id: true,
        slug: true, 
        name: true,
        description: true,
        material: true,
        brand: true, 
        isFinalSale: true,
        productType: { select: {slug: true, name: true}},
        category: { select: {slug: true, name: true}},
        option1Name: true,
        option2Name: true,
        images: {
          select: {key: true, alt: true, variantId: true},
          orderBy: [{ position: "asc"}, {id: "asc"}],
        },
        variants: { 
          where: { isActive: true},
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
          orderBy: [{ position: "asc"}, {id: "asc"}],
        },
      },
      orderBy:[{id: "asc"}]
  });

  return products.map((product) => ({ 
    id: product.id, 
    slug: product.slug, 
    name: product.name,
    description: product.description,
    material: product.material, 
    brand: product.brand, 
    isFinalSale: product.isFinalSale,
    productType: product.productType,
    category: product.category, 
    option1Name: product.option1Name,
    option2Name: product.option2Name,
    images: product.images.map((image) => ({
      url: getImageUrl(image.key),
      alt: image.alt,
      variantId: image.variantId,
    })),
    variants: product.variants.map(({ heightIn, widthIn, depthIn, ...variant}) => ({ 
      ...variant,
      dimensions: formatDimensions({ heightIn, widthIn, depthIn}, product.productType.slug),
    })),
  }));
};
