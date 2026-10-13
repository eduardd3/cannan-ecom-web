import type { Metadata } from "next";
import Link from "next/link";

import { formatOrderDate } from "@/lib/orders/format";
import { PRODUCT_STATUS_LABEL, PRODUCT_STATUSES, parseProductStatus } from "@/lib/products/format";
import { listAdminProducts } from "@/lib/products/queries";
import { requireStaff } from "@/lib/session";
import StockCount from "../inventory/stock-count";
import ProductStatusBadge from "./status-badge";

export const metadata: Metadata = {
  title: "Products | CANNAN Portal",
  robots: { index: false },
};

//  ?status= filters the list; anything unrecognized shows every product.
export default async function ProductsPage({ searchParams }: PageProps<"/adm/products">) {
  await requireStaff();
  const status = parseProductStatus((await searchParams).status);
  const { products, countByStatus, total } = await listAdminProducts(status);

  const tabs = [
    { href: "/adm/products", label: "All", count: total, active: status === null },
    ...PRODUCT_STATUSES.map((value) => ({
      href: `/adm/products?status=${value}`,
      label: PRODUCT_STATUS_LABEL[value],
      count: countByStatus.get(value) ?? 0,
      active: status === value,
    })),
  ];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-adm-fg">Products</h1>
        <Link
          href="/adm/products/new"
          className="rounded-md bg-adm-fg px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-adm-fg/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-muted"
        >
          New product
        </Link>
      </div>

      <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              tab.active
                ? "border-adm-muted bg-adm-border text-adm-fg"
                : "border-adm-border text-adm-muted hover:bg-adm-border hover:text-adm-fg"
            }`}
          >
            {tab.label} <span className="tabular-nums opacity-70">{tab.count}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-6 overflow-x-auto rounded-xl border border-adm-border bg-adm-surface">
        {products.length === 0 ? (
          <p className="p-6 text-adm-muted">No products here.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-adm-border text-adm-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Collection</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Variants</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-adm-border text-adm-fg">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-adm-border/40">
                  <td className="px-4 py-3">
                    <Link href={`/adm/products/${product.id}`} className="font-medium underline-offset-2 hover:underline">
                      {product.name}
                    </Link>
                    <div className="font-mono text-xs text-adm-muted">{product.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-adm-muted">{product.collectionName}</td>
                  <td className="px-4 py-3">
                    <ProductStatusBadge status={product.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {product.activeVariantCount}
                    {product.variantCount !== product.activeVariantCount && (
                      <span className="text-adm-muted"> of {product.variantCount}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <StockCount stock={product.totalStock} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-adm-muted">{formatOrderDate(product.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
