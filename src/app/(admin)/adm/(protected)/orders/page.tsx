import type { Metadata } from "next";
import Link from "next/link";

import { formatCents } from "@/lib/cart/format";
import { formatOrderDate, ORDER_STATUS_LABEL } from "@/lib/orders/format";
import { listOrders, ORDER_LIST_LIMIT, ORDER_STATUSES, parseOrderStatus } from "@/lib/orders/queries";
import { requireStaff } from "@/lib/session";
import StatusBadge from "./status-badge";

export const metadata: Metadata = {
  title: "Orders | CANNAN Portal",
  robots: { index: false },
};

//  ?status= filters the list; anything unrecognized shows all orders.
export default async function OrdersPage({ searchParams }: PageProps<"/adm/orders">) {
  await requireStaff();
  const status = parseOrderStatus((await searchParams).status);
  const { orders, countByStatus, total } = await listOrders(status);

  const tabs = [
    { href: "/adm/orders", label: "All", count: total, active: status === null },
    ...ORDER_STATUSES.map((value) => ({
      href: `/adm/orders?status=${value}`,
      label: ORDER_STATUS_LABEL[value],
      count: countByStatus.get(value) ?? 0,
      active: status === value,
    })),
  ];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-2xl font-bold text-adm-fg">Orders</h1>

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
        {orders.length === 0 ? (
          <p className="p-6 text-adm-muted">No orders here.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-adm-border text-adm-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Placed</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Lines</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-adm-border text-adm-fg">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-adm-border/40">
                  <td className="px-4 py-3">
                    <Link href={`/adm/orders/${order.id}`} className="font-medium underline-offset-2 hover:underline">
                      #{order.id}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-adm-muted">{formatOrderDate(order.createdAt)}</td>
                  <td className="px-4 py-3">{order.email}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{order.lineCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCents(order.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {orders.length === ORDER_LIST_LIMIT && (
        <p className="mt-3 text-sm text-adm-muted">Showing the latest {ORDER_LIST_LIMIT}.</p>
      )}
    </div>
  );
}
