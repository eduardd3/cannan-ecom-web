import type { ProductStatus } from "@/generated/prisma/enums";
import { PRODUCT_STATUS_LABEL } from "@/lib/products/format";

const STYLE: Record<ProductStatus, string> = {
  DRAFT: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  ACTIVE: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  ARCHIVED: "border-[#2A2F36] bg-[#2A2F36]/40 text-[#9AA1AB]",
};

export default function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${STYLE[status]}`}>
      {PRODUCT_STATUS_LABEL[status]}
    </span>
  );
}
