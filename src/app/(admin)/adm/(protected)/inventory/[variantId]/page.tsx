import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { REASON_LABEL } from "@/lib/inventory/manual";
import { getVariantInventory, LEDGER_LIMIT } from "@/lib/inventory/queries";
import { formatOrderDate } from "@/lib/orders/format";
import { requireStaff } from "@/lib/session";
import StockCount from "../stock-count";
import AdjustForm from "./adjust-form";

export const metadata: Metadata = {
  title: "Stock | CANNAN Portal",
  robots: { index: false },
};

const CARD = "rounded-xl border border-adm-border bg-adm-surface p-6";

export default async function VariantInventoryPage({ params }: PageProps<"/adm/inventory/[variantId]">) {
  await requireStaff();
  const id = Number((await params).variantId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const variant = await getVariantInventory(id);
  if (!variant) notFound();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <Link href="/adm/inventory" className="text-sm text-adm-muted underline-offset-2 hover:underline">
          ← Inventory
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-adm-fg">{variant.product.name}</h1>
        <p className="mt-1 text-sm text-adm-muted">
          {variant.variantLabel && `${variant.variantLabel} · `}SKU {variant.sku}
          {variant.amazonAsin && ` · ASIN ${variant.amazonAsin}`}
          {!variant.isActive && " · variant off"}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <section aria-labelledby="stock-heading" className={CARD}>
          <h2 id="stock-heading" className="font-semibold text-adm-fg">
            In stock
          </h2>
          <p className="mt-2 text-4xl">
            <StockCount stock={variant.stock} />
          </p>
          {variant.ledgerConsistent ? (
            <p className="mt-3 text-sm text-adm-muted">Matches the ledger below.</p>
          ) : (
            <p role="alert" className="mt-3 text-sm text-amber-700">
              The ledger adds up to {variant.ledgerSum}, not {variant.stock}. Something changed stock without
              recording it.
            </p>
          )}
        </section>

        <section aria-labelledby="adjust-heading" className={CARD}>
          <h2 id="adjust-heading" className="font-semibold text-adm-fg">
            Record a change
          </h2>
          <div className="mt-4">
            <AdjustForm variantId={variant.id} />
          </div>
        </section>
      </div>

      <section aria-labelledby="ledger-heading" className={`${CARD} overflow-x-auto p-0`}>
        <h2 id="ledger-heading" className="px-6 pt-6 font-semibold text-adm-fg">
          History
        </h2>
        {variant.inventoryAdjustments.length === 0 ? (
          <p className="px-6 py-4 text-sm text-adm-muted">No stock movements yet.</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead className="border-y border-adm-border text-adm-muted">
              <tr>
                <th className="px-6 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 text-right font-medium">Change</th>
                <th className="px-4 py-3 text-right font-medium">After</th>
                <th className="px-4 py-3 font-medium">Note</th>
                <th className="px-6 py-3 font-medium">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-adm-border text-adm-fg">
              {variant.inventoryAdjustments.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="whitespace-nowrap px-6 py-3 text-adm-muted">{formatOrderDate(row.createdAt)}</td>
                  <td className="px-4 py-3">
                    {REASON_LABEL[row.reason]}
                    {row.orderId && (
                      <>
                        {" "}
                        <Link
                          href={`/adm/orders/${row.orderId}`}
                          className="text-adm-muted underline-offset-2 hover:underline"
                        >
                          #{row.orderId}
                        </Link>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.delta > 0 ? `+${row.delta}` : row.delta}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.stockAfter}</td>
                  <td className="px-4 py-3 text-adm-muted">{row.note ?? ""}</td>
                  <td className="px-6 py-3 text-adm-muted">{row.createdBy?.email ?? "System"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {variant.inventoryAdjustments.length === LEDGER_LIMIT && (
          <p className="px-6 pb-4 text-sm text-adm-muted">Showing the latest {LEDGER_LIMIT}.</p>
        )}
      </section>
    </div>
  );
}
