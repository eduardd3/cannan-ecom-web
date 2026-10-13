// lib/products/variant-actions.ts
//
// Admin WRITE side for variants. Every export from a "use server" file is a
// public POST endpoint, so each one calls requireStaff() before anything else.
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/session";
import {
  MAX_OPENING_STOCK,
  MAX_POSITION,
  normalizeSku,
  parseAsin,
  parseOption,
  parsePriceCents,
  parseWholeNumber,
} from "./variant-fields";
import {
  createProductVariant,
  setVariantActive,
  updateProductVariant,
  type VariantField,
  type VariantFields,
} from "./variants";

// The form's values as typed. A failure echoes them back: React resets the
// form after every action, so the form uses them as defaults.
export type VariantFormValues = {
  optionName: string;
  optionValue: string;
  price: string;
  sku: string;
  amazonAsin: string;
  position: string;
  openingStock: string;
};

export type VariantActionState =
  | { ok: true }
  | { ok: false; field?: VariantField; message: string; values: VariantFormValues }
  | null;

export type VariantToggleState = { ok: true } | { ok: false; message: string } | null;

const idSchema = z.coerce.number().int().positive();

function readValues(formData: FormData): VariantFormValues {
  const text = (name: string) => String(formData.get(name) ?? "");
  return {
    optionName: text("optionName"),
    optionValue: text("optionValue"),
    price: text("price"),
    sku: text("sku"),
    amazonAsin: text("amazonAsin"),
    position: text("position"),
    openingStock: text("openingStock"),
  };
}

type Failure = { ok: false; field?: VariantField; message: string };

function parseFields(values: VariantFormValues): { ok: true; fields: VariantFields } | Failure {
  const option = parseOption(values.optionName, values.optionValue);
  if (!option.ok) {
    return { ok: false, field: "option", message: "message" in option ? option.message : "Check the option." };
  }

  const priceCents = parsePriceCents(values.price);
  if (priceCents === null) {
    return { ok: false, field: "priceCents", message: "Enter a price in dollars, like 24.99." };
  }

  const sku = normalizeSku(values.sku);
  if (!sku) return { ok: false, field: "sku", message: "Enter a SKU: letters, digits, and - _ . only." };

  const asin = parseAsin(values.amazonAsin);
  if (!asin.ok) {
    return { ok: false, field: "amazonAsin", message: "An ASIN is 10 letters or digits. Leave it blank if there isn't one." };
  }

  const position = parseWholeNumber(values.position, MAX_POSITION, null);
  if (!position.ok) {
    return { ok: false, field: "position", message: `Position is a whole number from 0 to ${MAX_POSITION}.` };
  }

  return {
    ok: true,
    fields: { option: option.value, priceCents, sku, amazonAsin: asin.value, position: position.value },
  };
}

// Price, options, and availability show on the storefront, carts, and stock pages.
function revalidateVariants() {
  revalidatePath("/adm/products", "layout");
  revalidatePath("/adm/inventory", "layout");
  revalidatePath("/products", "layout");
}

export async function createVariantAction(_prev: VariantActionState, formData: FormData): Promise<VariantActionState> {
  const admin = await requireStaff();
  const values = readValues(formData);
  const productId = idSchema.safeParse(formData.get("productId"));
  if (!productId.success) return { ok: false, message: "That request wasn't valid.", values };

  const parsed = parseFields(values);
  if (!parsed.ok) return { ...parsed, values };
  const openingStock = parseWholeNumber(values.openingStock, MAX_OPENING_STOCK, 0);
  if (!openingStock.ok || openingStock.value === null) {
    return {
      ok: false,
      field: "openingStock",
      message: `Opening stock is a whole number from 0 to ${MAX_OPENING_STOCK.toLocaleString("en-US")}.`,
      values,
    };
  }

  const result = await createProductVariant(
    productId.data,
    { ...parsed.fields, openingStock: openingStock.value },
    admin.id,
  );
  if (!result.ok) return { ...result, values };

  revalidateVariants();
  return { ok: true };
}

export async function updateVariantAction(_prev: VariantActionState, formData: FormData): Promise<VariantActionState> {
  await requireStaff();
  const values = readValues(formData);
  const variantId = idSchema.safeParse(formData.get("variantId"));
  if (!variantId.success) return { ok: false, message: "That request wasn't valid.", values };

  const parsed = parseFields(values);
  if (!parsed.ok) return { ...parsed, values };

  const result = await updateProductVariant(variantId.data, parsed.fields);
  if (!result.ok) return { ...result, values };

  revalidateVariants();
  return { ok: true };
}

export async function setVariantActiveAction(_prev: VariantToggleState, formData: FormData): Promise<VariantToggleState> {
  await requireStaff();
  const variantId = idSchema.safeParse(formData.get("variantId"));
  const active = formData.get("active");
  if (!variantId.success || (active !== "true" && active !== "false")) {
    return { ok: false, message: "That request wasn't valid." };
  }

  const result = await setVariantActive(variantId.data, active === "true");
  if (!result.ok) return { ok: false, message: result.message };

  revalidateVariants();
  return { ok: true };
}
