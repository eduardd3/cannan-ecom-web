import type { OrderStatus } from "@/generated/prisma/enums";
import { ORDER_STATUS_LABEL } from "@/lib/orders/format";

const STYLE: Record<OrderStatus, string> = {
  NEEDS_REVIEW: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  PAID: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  FULFILLED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  REFUNDED: "border-[#2A2F36] bg-[#2A2F36]/40 text-[#9AA1AB]",
  CANCELED: "border-[#2A2F36] bg-[#2A2F36]/40 text-[#9AA1AB]",
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${STYLE[status]}`}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
