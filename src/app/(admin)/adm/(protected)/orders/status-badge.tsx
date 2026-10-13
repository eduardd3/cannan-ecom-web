import type { OrderStatus } from "@/generated/prisma/enums";
import { ORDER_STATUS_LABEL } from "@/lib/orders/format";

const STYLE: Record<OrderStatus, string> = {
  NEEDS_REVIEW: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  PAID: "border-sky-500/40 bg-sky-500/10 text-sky-700",
  FULFILLED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  REFUNDED: "border-adm-border bg-adm-border/40 text-adm-muted",
  CANCELED: "border-adm-border bg-adm-border/40 text-adm-muted",
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${STYLE[status]}`}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
