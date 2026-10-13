import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import Container from "@/app/components/container";
import { getCurrentUserId } from "@/lib/cart/session";
import { getProductBySlug, getRedirectedSlug } from "@/lib/catalog/queries";
import { isCatalogEnabled } from "@/lib/flags";
import { productPath } from "@/lib/products/slug";
import ProductPurchase from "./product-purchase";

//  Full OG and structured data come with launch readiness; title and
//  description are enough until then.
export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  //  Checked here too: metadata renders separately from the page, and would
  //  otherwise leak the product name into <title> while the catalog is off.
  if (!isCatalogEnabled()) return { title: "Not found | CANNAN" };
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Not found | CANNAN" };
  return {
    title: `${product.name} | CANNAN`,
    description: product.description.slice(0, 160),
  };
}

//  Missing, draft, and archived products all 404: getProductBySlug only
//  returns ACTIVE products with an active variant. So does every product while
//  the catalog is switched off. A renamed product's old slug 308s to its
//  current one, so indexed links survive a rename.
export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  if (!isCatalogEnabled()) notFound();
  const { slug } = await params;
  const [product, userId] = await Promise.all([getProductBySlug(slug), getCurrentUserId()]);
  if (!product) {
    const currentSlug = await getRedirectedSlug(slug);
    if (currentSlug) permanentRedirect(productPath(currentSlug));
    notFound();
  }

  return (
    <Container className="py-10">
      <Link href="/products" className="text-sm text-neutral-600 underline-offset-2 hover:underline">
        ← All products
      </Link>
      <ProductPurchase product={product} signedIn={userId !== null} />
    </Container>
  );
}
