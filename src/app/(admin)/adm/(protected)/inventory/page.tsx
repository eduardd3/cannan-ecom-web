import type { Metadata } from "next";
import Link from "next/link";

import { LOW_STOCK_THRESHOLD, listInventory, parseStockFilter } from "@/lib/inventory/queries";
import { requireStaff } from "@/lib/session";
import StockCount from "./stock-count";

export const metadata: Metadata = {
  title: "Inventory | CANNAN Portal",
  robots: { index: false },
};

//  ?stock=low|out filters the list; anything unrecognized shows every variant.
export default async function InventoryPage({ searchParams }: PageProps<"/adm/inventory">) {
  await requireStaff();
  const filter = parseStockFilter((await searchParams).stock);
  const { variants, counts } = await listInventory(filter);

  const tabs = [
    { href: "/adm/inventory", label: "All", count: counts.total, active: filter === null },
    { href: "/adm/inventory?stock=low", label: `Low (≤${LOW_STOCK_THRESHOLD})`, count: counts.low, active: filter === "low" },
    { href: "/adm/inventory?stock=out", label: "Out of stock", count: counts.out, active: filter === "out" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-2xl font-bold text-adm-fg">Inventory</h1>
      <p className="mt-1 text-sm text-adm-muted">
        Amazon and Walmart sell from this same stock. Record their sales here so the storefront doesn&apos;t oversell.
      </p>

      <nav aria-label="Filter by stock" className="mt-6 flex flex-wrap gap-2">
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
        {variants.length === 0 ? (
          <p className="p-6 text-adm-muted">No variants here.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-adm-border text-adm-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Collection</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-adm-border text-adm-fg">
              {variants.map((variant) => (
                <tr key={variant.id} className="hover:bg-adm-border/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/adm/inventory/${variant.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {variant.productName}
                    </Link>
                    {variant.variantLabel && <div className="text-adm-muted">{variant.variantLabel}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{variant.sku}</td>
                  <td className="px-4 py-3 text-adm-muted">{variant.collectionName}</td>
                  <td className="px-4 py-3 text-adm-muted">
                    {variant.productStatus === "ACTIVE" ? "Listed" : variant.productStatus === "DRAFT" ? "Draft" : "Archived"}
                    {!variant.isActive && " · variant off"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <StockCount stock={variant.stock} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
