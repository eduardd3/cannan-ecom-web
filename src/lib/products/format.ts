// No server imports: used by admin pages and their client components.
import type { ProductStatus } from "@/generated/prisma/enums";

export const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const satisfies readonly ProductStatus[];

// "Listed" rather than "Active": it's what the status means to a shopper.
export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Listed",
  ARCHIVED: "Archived",
};

export function parseProductStatus(value: unknown): ProductStatus | null {
  return PRODUCT_STATUSES.find((status) => status === value) ?? null;
}

export const MAX_NAME_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 5_000;
