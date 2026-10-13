import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAdminCategory } from "@/lib/categories/queries";
import { formatOrderDate } from "@/lib/orders/format";
import { requireStaff } from "@/lib/session";
import ProductStatusBadge from "../../products/status-badge";
import CategoryForm from "../category-form";
import DeleteCategoryForm from "./delete-form";

export async function generateMetadata({ params }: PageProps<"/adm/categories/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Category #${id} | CANNAN Portal`, robots: { index: false } };
}

const CARD = "rounded-xl border border-adm-border bg-adm-surface p-6";

export default async function EditCategoryPage({ params }: PageProps<"/adm/categories/[id]">) {
  await requireStaff();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const category = await getAdminCategory(id);
  if (!category) notFound();

  const productCount = category.products.length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Link href="/adm/categories" className="text-sm text-adm-muted underline-offset-2 hover:underline">
          ← Categories
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-adm-fg">{category.name}</h1>
        <p className="mt-1 text-sm text-adm-muted">Created {formatOrderDate(category.createdAt)}</p>
      </div>

      <section aria-label="Details" className={CARD}>
        <CategoryForm
          saved={{
            id: category.id,
            values: { name: category.name, slug: category.slug, description: category.description ?? "" },
            listedProductCount: category.products.filter((product) => product.status === "ACTIVE").length,
          }}
        />
      </section>

      <section aria-labelledby="products-heading" className={CARD}>
        <h2 id="products-heading" className="font-semibold text-adm-fg">
          Products
        </h2>
        {productCount === 0 ? (
          <p className="mt-1 text-sm text-adm-muted">No products use this category.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {category.products.map((product) => (
              <li key={product.id} className="flex flex-wrap items-center gap-3">
                <Link href={`/adm/products/${product.id}`} className="text-adm-fg underline-offset-2 hover:underline">
                  {product.name}
                </Link>
                <ProductStatusBadge status={product.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="delete-heading" className={CARD}>
        <h2 id="delete-heading" className="font-semibold text-adm-fg">
          Delete
        </h2>
        {productCount > 0 ? (
          <p className="mt-1 text-sm text-adm-muted">
            Used by {productCount} {productCount === 1 ? "product" : "products"}. Remove it from them before deleting.
          </p>
        ) : (
          <div className="mt-3">
            <DeleteCategoryForm categoryId={category.id} name={category.name} />
          </div>
        )}
      </section>
    </div>
  );
}
