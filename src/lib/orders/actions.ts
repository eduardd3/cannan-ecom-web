// lib/orders/actions.ts
//
// Admin WRITE side for orders. Every export from a "use server" file is a
// public POST endpoint, so each one calls requireStaff() before anything else.
"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { adjustStockStandalone } from "@/lib/inventory/adjust";
import { requireStaff } from "@/lib/session";
import { sendOrderConfirmation } from "./confirmation";
import { fulfillOrder, updateTracking, type FulfillInput, type FulfillResult } from "./fulfillment";
import { approveReviewedOrder, refundReviewedOrder } from "./review";
import { sendShippedEmail } from "./shipped-email";
import { normalizeTrackingNumber, parseCarrier } from "./shipping";

// What the forms render. null before the first submit.
export type OrderActionState = { ok: true } | { ok: false; message: string } | null;

// The fulfill form also gets back what was typed: React resets the form after
// every action, so a failure would otherwise clear the tracking number.
export type FulfillActionState =
  | { ok: true }
  | { ok: false; message: string; fields: { carrier: string; trackingNumber: string } }
  | null;

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
  // The confirmation held back while the order was in review goes out now.
  if (result.ok) after(() => sendOrderConfirmation(orderId.data));
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

// Shared by ship and edit: same fields, same validation, different write.
async function shipmentAction(
  formData: FormData,
  write: (input: FulfillInput) => Promise<FulfillResult>,
): Promise<FulfillActionState> {
  const admin = await requireStaff();
  const fields = {
    carrier: String(formData.get("carrier") ?? ""),
    trackingNumber: String(formData.get("trackingNumber") ?? ""),
  };
  const orderId = orderIdSchema.safeParse(formData.get("orderId"));
  const carrier = parseCarrier(fields.carrier);
  if (!orderId.success || !carrier) return { ok: false, message: "That request wasn't valid.", fields };

  const trackingNumber = normalizeTrackingNumber(fields.trackingNumber);
  if (!trackingNumber) {
    return { ok: false, message: "Enter the tracking number: letters, digits, and hyphens.", fields };
  }

  const result = await write({ orderId: orderId.data, carrier, trackingNumber, adminId: admin.id });
  revalidateOrders(false);
  return result.ok ? result : { ok: false, message: result.message, fields };
}

export async function fulfillOrderAction(_prev: FulfillActionState, formData: FormData): Promise<FulfillActionState> {
  return shipmentAction(formData, async (input) => {
    const result = await fulfillOrder(input);
    // After the response, so the admin isn't waiting on Resend.
    if (result.ok) after(() => sendShippedEmail(input.orderId));
    return result;
  });
}

export async function updateTrackingAction(_prev: FulfillActionState, formData: FormData): Promise<FulfillActionState> {
  return shipmentAction(formData, updateTracking);
}
