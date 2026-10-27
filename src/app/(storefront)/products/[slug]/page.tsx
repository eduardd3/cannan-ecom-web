import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import Container from "@/app/components/container";
import { getCurrentUserId } from "@/lib/cart/session";
import { breadcrumbParts, initialVariant, type BreadcrumbPart } from "@/lib/catalog/product-detail";
import { getProductBySlug, getRedirectedSlug } from "@/lib/catalog/queries";
import { isCatalogEnabled } from "@/lib/flags";
import { productPath } from "@/lib/products/slug";
import ProductPurchase from "./product-purchase";

//  Full OG and structured data come with launch readiness; title, description
//  and the canonical are enough until then. Canonical without ?variant=, so
//  each variant isn't indexed as a separate page.
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
    alternates: { canonical: productPath(product.slug) },
  };
}

type SearchParams = Record<string, string | string[] | undefined>;

//  "?variant=12", or "" without parameters, for the rename redirect.
function queryString(searchParams: SearchParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  }
  const string = query.toString();
  return string ? `?${string}` : "";
}

//  Missing, draft, and archived products all 404: getProductBySlug only
//  returns ACTIVE products with an active variant. So does every product while
//  the catalog is switched off. A renamed product's old slug 308s to its
//  current one with the query string kept, so indexed links and ?variant=
//  survive a rename. ?variant= picks the first render's variant, so the price,
//  images, and buy area are right before any JS runs; a bad id is ignored.
export default async function ProductPage({ params, searchParams }: PageProps<"/products/[slug]">) {
  if (!isCatalogEnabled()) notFound();
  const { slug } = await params;
  const [product, userId, query] = await Promise.all([getProductBySlug(slug), getCurrentUserId(), searchParams]);
  if (!product) {
    const currentSlug = await getRedirectedSlug(slug);
    if (currentSlug) permanentRedirect(`${productPath(currentSlug)}${queryString(query)}`);
    notFound();
  }

  return (
    <Container className="pt-4 pb-16 md:pt-6 md:pb-24">
      <Breadcrumb parts={breadcrumbParts(product)} current={product.name} />
      <ProductPurchase
        product={product}
        initialVariantId={initialVariant(product.variants, query.variant).id}
        signedIn={userId !== null}
      />
    </Container>
  );
}

//  The separator: inside each <li> after the first, so a "/" can never wrap
//  onto a line by itself. 60% opacity reads it as punctuation, not a name.
function Separator() {
  return (
    <span aria-hidden="true" className="px-2.5 opacity-60">
      /
    </span>
  );
}

//  The collection parts link back up; the trail ends on this product as plain
//  text with aria-current="page" (the WAI-ARIA breadcrumb pattern), so it
//  always says where you are, and a one-part trail is never a lone link.
//
//  Tap area: a ::before pseudo-element stretches each link's hit area to 44px
//  tall without changing its box, so the text sits where it would and the
//  focus outline hugs the text instead of a 44px-tall box.
//
//  role="list": Safari drops the list semantics of an <ol> with list-style
//  none (Tailwind's preflight), so VoiceOver wouldn't announce "list, 3 items".
function Breadcrumb({ parts, current }: { parts: BreadcrumbPart[]; current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 md:mb-8">
      <ol role="list" className="flex flex-wrap items-center gap-y-2 text-caption text-stone">
        {parts.map(({ name, href }, index) => (
          <li key={href} className="flex items-center">
            {index > 0 && <Separator />}
            <Link
              href={href}
              className="relative transition-colors before:absolute before:-inset-x-1 before:-inset-y-3.25 before:content-[''] hover:text-charcoal hover:underline hover:decoration-1 hover:underline-offset-3"
            >
              {name}
            </Link>
          </li>
        ))}
        <li className="flex min-w-0 items-center">
          <Separator />
          <span aria-current="page" className="break-words text-charcoal">
            {current}
          </span>
        </li>
      </ol>
    </nav>
  );
}
