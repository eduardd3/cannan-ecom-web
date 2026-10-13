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
        <h1 className="text-2xl font-bold text-[#F2F3F4]">Products</h1>
        <Link
          href="/adm/products/new"
          className="rounded-md bg-[#F2F3F4] px-4 py-2 text-sm font-medium text-[#16191E] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9AA1AB]"
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
                ? "border-[#9AA1AB] bg-[#2A2F36] text-[#F2F3F4]"
                : "border-[#2A2F36] text-[#9AA1AB] hover:bg-[#2A2F36] hover:text-[#F2F3F4]"
            }`}
          >
            {tab.label} <span className="tabular-nums opacity-70">{tab.count}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-6 overflow-x-auto rounded-xl border border-[#2A2F36] bg-[#16191E]">
        {products.length === 0 ? (
          <p className="p-6 text-[#9AA1AB]">No products here.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#2A2F36] text-[#9AA1AB]">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Collection</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Variants</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2F36] text-[#F2F3F4]">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-[#2A2F36]/40">
                  <td className="px-4 py-3">
                    <Link href={`/adm/products/${product.id}`} className="font-medium underline-offset-2 hover:underline">
                      {product.name}
                    </Link>
                    <div className="font-mono text-xs text-[#9AA1AB]">{product.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-[#9AA1AB]">{product.collectionName}</td>
                  <td className="px-4 py-3">
                    <ProductStatusBadge status={product.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {product.activeVariantCount}
                    {product.variantCount !== product.activeVariantCount && (
                      <span className="text-[#9AA1AB]"> of {product.variantCount}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <StockCount stock={product.totalStock} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[#9AA1AB]">{formatOrderDate(product.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
