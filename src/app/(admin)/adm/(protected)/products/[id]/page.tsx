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

const CARD = "rounded-xl border border-[#2A2F36] bg-[#16191E] p-6";

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
        <Link href="/adm/products" className="text-sm text-[#9AA1AB] underline-offset-2 hover:underline">
          ← Products
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-[#F2F3F4]">{product.name}</h1>
          <ProductStatusBadge status={product.status} />
        </div>
        <p className="mt-1 text-sm text-[#9AA1AB]">
          Created {formatOrderDate(product.createdAt)}
          {product.publishedAt && ` · first listed ${formatOrderDate(product.publishedAt)}`}
          {product.status === "ACTIVE" && (
            <>
              {" · "}
              <Link href={productPath(product.slug)} 
              className="underline underline-offset-2 hover:text-[#F2F3F4]"
              target="_blank"
              rel="noopener noreferrer">
                View on storefront
              </Link>
            </>
          )}
        </p>
      </div>

      <section aria-label="Details" className={CARD}>
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
        />
      </section>

      <section aria-labelledby="variants-heading" className={`${CARD} overflow-x-auto p-0`}>
        <h2 id="variants-heading" className="px-6 pt-6 font-semibold text-[#F2F3F4]">
          Variants
        </h2>
        <Variants productId={product.id} variants={product.variants} />
      </section>

      <section aria-labelledby="images-heading" className={CARD}>
        <h2 id="images-heading" className="mb-4 font-semibold text-[#F2F3F4]">
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

      {product.slugRedirects.length > 0 && (
        <section aria-labelledby="redirects-heading" className={CARD}>
          <h2 id="redirects-heading" className="font-semibold text-[#F2F3F4]">
            Old URLs
          </h2>
          <p className="mt-1 text-sm text-[#9AA1AB]">These redirect to the current URL.</p>
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {product.slugRedirects.map((redirect) => (
              <li key={redirect.slug} className="flex flex-wrap gap-x-3">
                <span className="break-all font-mono text-[#F2F3F4]">{productPath(redirect.slug)}</span>
                <span className="text-[#9AA1AB]">until {formatOrderDate(redirect.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
