import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatCents } from "@/lib/cart/format";
import { addressLines, formatOrderDate } from "@/lib/orders/format";
import { getOrderDetail, type OrderDetail } from "@/lib/orders/queries";
import { CARRIER_LABEL, trackingUrl } from "@/lib/orders/shipping";
import { requireStaff } from "@/lib/session";
import StatusBadge from "../status-badge";
import FulfillForm from "./fulfill-form";
import ShipmentEditor from "./shipment-editor";
import RestockForm from "./restock-form";
import ReviewActions from "./review-actions";

export async function generateMetadata({ params }: PageProps<"/adm/orders/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order #${id} | CANNAN Portal`, robots: { index: false } };
}

const CARD = "rounded-xl border border-adm-border bg-adm-surface p-6";

function ShipmentDetails({ order }: { order: OrderDetail }) {
  if (!order.carrier || !order.trackingNumber || !order.fulfilledAt) return null;
  const href = trackingUrl(order.carrier, order.trackingNumber);

  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
      <dt className="text-adm-muted">Carrier</dt>
      <dd className="text-adm-fg">{CARRIER_LABEL[order.carrier]}</dd>
      <dt className="text-adm-muted">Tracking</dt>
      <dd className="break-all font-mono text-adm-fg">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-adm-fg">
            {order.trackingNumber}
          </a>
        ) : (
          order.trackingNumber
        )}
      </dd>
      <dt className="text-adm-muted">Shipped</dt>
      <dd className="text-adm-fg">
        {formatOrderDate(order.fulfilledAt)}
        {order.fulfilledBy && <span className="text-adm-muted"> by {order.fulfilledBy.email}</span>}
      </dd>
      {order.trackingUpdatedAt && (
        <>
          <dt className="text-adm-muted">Tracking updated</dt>
          <dd className="text-adm-fg">
            {formatOrderDate(order.trackingUpdatedAt)}
            {order.trackingUpdatedBy && <span className="text-adm-muted"> by {order.trackingUpdatedBy.email}</span>}
          </dd>
        </>
      )}
    </dl>
  );
}

export default async function OrderDetailPage({ params }: PageProps<"/adm/orders/[id]">) {
  await requireStaff();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const order = await getOrderDetail(id);
  if (!order) notFound();

  const inReview = order.status === "NEEDS_REVIEW";
  const address = addressLines(order.shippingAddress);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <Link href="/adm/orders" className="text-sm text-adm-muted underline-offset-2 hover:underline">
          ← Orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-adm-fg">Order #{order.id}</h1>
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-sm text-adm-muted">Placed {formatOrderDate(order.createdAt)}</p>
      </div>

      {order.reviewReason && (
        <section
          aria-labelledby="review-heading"
          className={`${CARD} ${inReview ? "border-amber-500/40" : ""}`}
        >
          <h2 id="review-heading" className="font-semibold text-adm-fg">
            {inReview ? "Needs review" : "Review"}
          </h2>
          <p className="mt-2 text-sm text-adm-fg">{order.reviewReason}</p>
          {inReview ? (
            <>
              <p className="mt-3 text-sm text-adm-muted">
                Approve takes stock for any line still short and marks the order paid. Restock short lines first.
                Refund returns the full payment in Stripe and puts back the units this order took.
              </p>
              <div className="mt-4">
                <ReviewActions orderId={order.id} refundLabel={formatCents(order.totalCents)} />
              </div>
            </>
          ) : (
            order.reviewResolvedAt && (
              <p className="mt-2 text-sm text-adm-muted">
                Resolved {formatOrderDate(order.reviewResolvedAt)}
                {order.reviewResolvedBy && ` by ${order.reviewResolvedBy.email}`}.
              </p>
            )
          )}
        </section>
      )}

      {order.status === "PAID" && (
        <section aria-labelledby="ship-heading" className={CARD}>
          <h2 id="ship-heading" className="font-semibold text-adm-fg">
            Ship
          </h2>
          <p className="mt-2 text-sm text-adm-muted">
            Once it&apos;s handed to the carrier, record the tracking number to mark the order fulfilled.
          </p>
          <div className="mt-4">
            <FulfillForm orderId={order.id} />
          </div>
        </section>
      )}

      {order.carrier && order.trackingNumber && order.fulfilledAt && (
        <section aria-labelledby="shipment-heading" className={CARD}>
          <h2 id="shipment-heading" className="font-semibold text-adm-fg">
            Shipment
          </h2>
          <div className="mt-2">
            {/* Tracking can be corrected only while the order is FULFILLED. */}
            {order.status === "FULFILLED" ? (
              <ShipmentEditor
                orderId={order.id}
                shipment={{ carrier: order.carrier, trackingNumber: order.trackingNumber }}
              >
                <ShipmentDetails order={order} />
              </ShipmentEditor>
            ) : (
              <ShipmentDetails order={order} />
            )}
          </div>
        </section>
      )}

      <section aria-labelledby="items-heading" className={`${CARD} overflow-x-auto p-0`}>
        <h2 id="items-heading" className="px-6 pt-6 font-semibold text-adm-fg">
          Items
        </h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="border-y border-adm-border text-adm-muted">
            <tr>
              <th className="px-6 py-3 font-medium">Item</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 text-right font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Stock taken</th>
              <th className="px-6 py-3 text-right font-medium">Line total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-adm-border text-adm-fg">
            {order.items.map((item) => {
              const shortBy = item.outstanding - item.stockNow;
              return (
                <tr key={item.id} className="align-top">
                  <td className="px-6 py-3">
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {item.productName}
                    </Link>
                    {item.variantLabel && <div className="text-adm-muted">{item.variantLabel}</div>}
                    <div className="text-xs text-adm-muted">SKU {item.sku}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCents(item.unitPriceCents)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
                  <td className="px-4 py-3">
                    <div className="tabular-nums">
                      {item.deducted} of {item.quantity}
                      <span className="text-adm-muted"> · {item.stockNow} in stock now</span>
                    </div>
                    {inReview && item.outstanding > 0 && (
                      <div className="mt-2 flex flex-col gap-2">
                        <span className={shortBy > 0 ? "text-amber-700" : "text-adm-muted"}>
                          {shortBy > 0
                            ? `${item.outstanding} still needed; short by ${shortBy}`
                            : `${item.outstanding} still needed; enough in stock to approve`}
                        </span>
                        {shortBy > 0 && (
                          <RestockForm orderId={order.id} variantId={item.variantId} suggested={shortBy} />
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums">
                    {formatCents(item.unitPriceCents * item.quantity)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <dl className="ml-auto grid max-w-xs grid-cols-2 gap-x-6 gap-y-1 px-6 py-4 text-sm">
          <dt className="text-adm-muted">Subtotal</dt>
          <dd className="text-right tabular-nums text-adm-fg">{formatCents(order.subtotalCents)}</dd>
          <dt className="text-adm-muted">Shipping</dt>
          <dd className="text-right tabular-nums text-adm-fg">{formatCents(order.shippingCents)}</dd>
          <dt className="text-adm-muted">Tax</dt>
          <dd className="text-right tabular-nums text-adm-fg">{formatCents(order.taxCents)}</dd>
          <dt className="font-semibold text-adm-fg">Total</dt>
          <dd className="text-right font-semibold tabular-nums text-adm-fg">{formatCents(order.totalCents)}</dd>
        </dl>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="customer-heading" className={CARD}>
          <h2 id="customer-heading" className="font-semibold text-adm-fg">
            Customer
          </h2>
          <p className="mt-2 text-sm text-adm-fg">{order.email}</p>
          {order.user.email !== order.email && (
            <p className="text-sm text-adm-muted">Account: {order.user.email}</p>
          )}
          <h3 className="mt-4 text-sm font-medium text-adm-muted">Ship to</h3>
          {address.length > 0 ? (
            <address className="mt-1 text-sm not-italic text-adm-fg">
              {address.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </address>
          ) : (
            <p className="mt-1 text-sm text-adm-muted">No address recorded.</p>
          )}
        </section>

        <section aria-labelledby="payment-heading" className={CARD}>
          <h2 id="payment-heading" className="font-semibold text-adm-fg">
            Payment
          </h2>
          <dl className="mt-2 flex flex-col gap-2 text-sm">
            <div>
              <dt className="text-adm-muted">Payment intent</dt>
              <dd className="break-all font-mono text-xs text-adm-fg">{order.stripePaymentIntentId ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-adm-muted">Checkout session</dt>
              <dd className="break-all font-mono text-xs text-adm-fg">{order.stripeCheckoutSessionId}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section aria-labelledby="ledger-heading" className={`${CARD} overflow-x-auto p-0`}>
        <h2 id="ledger-heading" className="px-6 pt-6 font-semibold text-adm-fg">
          Stock movements
        </h2>
        {order.inventoryAdjustments.length === 0 ? (
          <p className="px-6 py-4 text-sm text-adm-muted">None yet.</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead className="border-y border-adm-border text-adm-muted">
              <tr>
                <th className="px-6 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 text-right font-medium">Change</th>
                <th className="px-6 py-3 font-medium">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-adm-border text-adm-fg">
              {order.inventoryAdjustments.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-6 py-3 text-adm-muted">{formatOrderDate(row.createdAt)}</td>
                  <td className="px-4 py-3">{row.reason}</td>
                  <td className="px-4 py-3">
                    {order.items.find((item) => item.variantId === row.variantId)?.sku ?? row.variantId}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.delta > 0 ? `+${row.delta}` : row.delta}</td>
                  <td className="px-6 py-3 text-adm-muted">{row.createdBy?.email ?? "Checkout"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
