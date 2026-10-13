import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatOrderDate } from "@/lib/orders/format";
import { getAdminProduct, getProductFormOptions } from "@/lib/products/queries";
import { productPath } from "@/lib/products/slug";
import { requireStaff } from "@/lib/session";
import ProductForm from "../product-form";
import ProductStatusBadge from "../status-badge";
import Images from "./images";
import Variants from "./variants";

export async function generateMetadata({ params }: PageProps<"/adm/products/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Product #${id} | CANNAN Portal`, robots: { index: false } };
}

const CARD = "rounded-xl border border-adm-border bg-adm-surface p-6";

export default async function EditProductPage({ params }: PageProps<"/adm/products/[id]">) {
  await requireStaff();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [product, options] = await Promise.all([getAdminProduct(id), getProductFormOptions()]);
  if (!product) notFound();

  const activeVariantCount = product.variants.filter((variant) => variant.isActive).length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Link href="/adm/products" className="text-sm text-adm-muted underline-offset-2 hover:underline">
          ← Products
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-adm-fg">{product.name}</h1>
          <ProductStatusBadge status={product.status} />
        </div>
        <p className="mt-1 text-sm text-adm-muted">
          Created {formatOrderDate(product.createdAt)}
          {product.publishedAt && ` · first listed ${formatOrderDate(product.publishedAt)}`}
          {product.status === "ACTIVE" && (
            <>
              {" · "}
              <Link href={productPath(product.slug)} 
              className="underline underline-offset-2 hover:text-adm-fg"
              target="_blank"
              rel="noopener noreferrer">
                View on storefront
              </Link>
            </>
          )}
        </p>
      </div>

      <ProductForm
        options={options}
        saved={{
          id: product.id,
          values: {
            name: product.name,
            slug: product.slug,
            description: product.description,
            collectionId: String(product.collectionId),
            categoryIds: product.categoryIds.map(String),
            status: product.status,
          },
          published: product.publishedAt !== null,
          activeVariantCount,
        }}
      >
        <section aria-labelledby="variants-heading" className={`${CARD} overflow-x-auto p-0`}>
          <h2 id="variants-heading" className="px-6 pt-6 font-semibold text-adm-fg">
            Variants
          </h2>
          <Variants productId={product.id} variants={product.variants} />
        </section>

        <section aria-labelledby="images-heading" className={CARD}>
          <h2 id="images-heading" className="mb-4 font-semibold text-adm-fg">
            Images
          </h2>
          <Images
            productId={product.id}
            productName={product.name}
            images={product.images}
            variants={product.variants.map((variant) => ({
              id: variant.id,
              label: `${variant.label ?? "Default"}${variant.isActive ? "" : " (off)"}`,
            }))}
          />
        </section>
      </ProductForm>

      {product.slugRedirects.length > 0 && (
        <section aria-labelledby="redirects-heading" className={CARD}>
          <h2 id="redirects-heading" className="font-semibold text-adm-fg">
            Old URLs
          </h2>
          <p className="mt-1 text-sm text-adm-muted">These redirect to the current URL.</p>
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {product.slugRedirects.map((redirect) => (
              <li key={redirect.slug} className="flex flex-wrap gap-x-3">
                <span className="break-all font-mono text-adm-fg">{productPath(redirect.slug)}</span>
                <span className="text-adm-muted">until {formatOrderDate(redirect.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
