// lib/orders/actions.ts
//
// Admin WRITE side for orders. Every export from a "use server" file is a
// public POST endpoint, so each one calls requireStaff() before anything else.
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { adjustStockStandalone } from "@/lib/inventory/adjust";
import { requireStaff } from "@/lib/session";
import { approveReviewedOrder, refundReviewedOrder } from "./review";

// What the forms render. null before the first submit.
export type OrderActionState = { ok: true } | { ok: false; message: string } | null;

const orderIdSchema = z.coerce.number().int().positive();

const restockSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  variantId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(10_000),
});

const INVALID: OrderActionState = { ok: false, message: "That request wasn't valid." };

// Stock moved, so storefront pages showing it are stale too.
function revalidateOrders(stockChanged: boolean) {
  revalidatePath("/adm/orders", "layout");
  if (stockChanged) revalidatePath("/products", "layout");
}

export async function approveOrderAction(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const admin = await requireStaff();
  const orderId = orderIdSchema.safeParse(formData.get("orderId"));
  if (!orderId.success) return INVALID;

  const result = await approveReviewedOrder(orderId.data, admin.id);
  revalidateOrders(result.ok);
  return result;
}

export async function refundOrderAction(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const admin = await requireStaff();
  const orderId = orderIdSchema.safeParse(formData.get("orderId"));
  if (!orderId.success) return INVALID;

  const result = await refundReviewedOrder(orderId.data, admin.id);
  revalidateOrders(result.ok);
  return result;
}

/** RESTOCK from an order page, so a short line can be filled before approving. */
export async function restockFromOrderAction(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const admin = await requireStaff();
  const parsed = restockSchema.safeParse({
    orderId: formData.get("orderId"),
    variantId: formData.get("variantId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) return { ok: false, message: "Enter a whole number of units, 1 or more." };

  const { orderId, variantId, quantity } = parsed.data;
  const result = await adjustStockStandalone({
    variantId,
    delta: quantity,
    reason: "RESTOCK",
    createdById: admin.id,
    note: `Restocked from order #${orderId}`,
  });
  if (!result.ok) return { ok: false, message: "That variant no longer exists." };

  revalidateOrders(true);
  return { ok: true };
}
