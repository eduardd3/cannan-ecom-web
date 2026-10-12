// lib/inventory/actions.ts
//
// Admin WRITE side for stock. Every export from a "use server" file is a
// public POST endpoint, so each one calls requireStaff() before anything else.
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/session";
import { MANUAL_REASONS, NOTE_REQUIRED } from "./manual";
import { recordManualAdjustment } from "./manual-adjust";

// What the form renders. null before the first submit. A failure echoes the
// typed values back: React resets the form after every action, so the form
// uses them as defaults to keep what the admin entered.
export type InventoryActionState =
  | { ok: true; stockAfter: number }
  | { ok: false; message: string; fields: { amount: string; note: string } }
  | null;

const adjustmentSchema = z.object({
  variantId: z.coerce.number().int().positive(),
  reason: z.enum(MANUAL_REASONS),
  // Range and per-reason rules are manualDelta's job; this only parses. Blank
  // is refused here: coerced, it would be 0, a recount to zero.
  amount: z.string().trim().min(1).pipe(z.coerce.number()),
  note: z
    .string()
    .trim()
    .max(500)
    .transform((note) => note || undefined),
});

export async function recordAdjustmentAction(
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const admin = await requireStaff();
  const fields = { amount: String(formData.get("amount") ?? ""), note: String(formData.get("note") ?? "") };
  const parsed = adjustmentSchema.safeParse({
    variantId: formData.get("variantId"),
    reason: formData.get("reason"),
    amount: fields.amount,
    note: fields.note,
  });
  if (!parsed.success) return { ok: false, message: "That request wasn't valid.", fields };

  const { variantId, reason, amount, note } = parsed.data;
  if (NOTE_REQUIRED.has(reason) && !note) {
    return { ok: false, message: "Add a note saying where this number came from.", fields };
  }

  const result = await recordManualAdjustment({ variantId, reason, amount, note, createdById: admin.id });
  if (!result.ok) return { ...result, fields };

  revalidatePath("/adm/inventory", "layout");
  // Stock shows on the storefront and on order pages too.
  revalidatePath("/products", "layout");
  revalidatePath("/adm/orders", "layout");
  return result;
}
