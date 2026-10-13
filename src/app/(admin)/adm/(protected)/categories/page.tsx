import type { Metadata } from "next";
import Link from "next/link";

import { listAdminCategories } from "@/lib/categories/queries";
import { requireStaff } from "@/lib/session";
import CategoryForm from "./category-form";

export const metadata: Metadata = {
  title: "Categories | CANNAN Portal",
  robots: { index: false },
};

export default async function CategoriesPage() {
  await requireStaff();
  const categories = await listAdminCategories();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-adm-fg">Categories</h1>
        <p className="mt-1 text-sm text-adm-muted">
          Browsing tags for products. The storefront only lists a category once a listed product uses it.
        </p>
      </div>

      <section aria-labelledby="add-heading" className="rounded-xl border border-adm-border bg-adm-surface p-6">
        <h2 id="add-heading" className="mb-4 font-semibold text-adm-fg">
          Add category
        </h2>
        <CategoryForm />
      </section>

      <div className="overflow-x-auto rounded-xl border border-adm-border bg-adm-surface">
        {categories.length === 0 ? (
          <p className="p-6 text-adm-muted">No categories yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-adm-border text-adm-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 text-right font-medium">Products</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-adm-border text-adm-fg">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-adm-border/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/adm/categories/${category.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {category.name}
                    </Link>
                    <div className="font-mono text-xs text-adm-muted">{category.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{category.productCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
