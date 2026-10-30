// lib/products/actions.ts
//
// Admin WRITE side for products. Every export from a "use server" file is a
// public POST endpoint, so each one calls requireStaff() before anything else.
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireStaff } from "@/lib/session";
import {
  MAX_BRAND_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_MATERIAL_LENGTH,
  MAX_NAME_LENGTH,
  parseProductStatus,
} from "./format";
import { createProduct, updateProduct, type ProductField, type ProductFields } from "./save";
import { slugProblem } from "./slug";
import { parseOptionPair } from "./variant-fields";

// The form's values as typed. A failure echoes them back: React resets the
// form after every action, so the form uses them as defaults.
export type ProductFormValues = {
  name: string;
  slug: string;
  description: string;
  collectionId: string;
  productTypeId: string;
  categoryId: string; // "" = none
  option1Name: string;
  option2Name: string;
  material: string; // "" = none
  brand: string; // "" = none
  isFinalSale: boolean;
  status: string;
  featured: boolean;
};

export type ProductActionState =
  | { ok: true; message: string }
  | { ok: false; field?: ProductField; message: string; values: ProductFormValues }
  | null;

const idSchema = z.coerce.number().int().positive();

function readValues(formData: FormData): ProductFormValues {
  const text = (name: string) => String(formData.get(name) ?? "");
  return {
    name: text("name"),
    slug: text("slug"),
    description: text("description"),
    collectionId: text("collectionId"),
    productTypeId: text("productTypeId"),
    categoryId: text("categoryId"),
    option1Name: text("option1Name"),
    option2Name: text("option2Name"),
    material: text("material"),
    brand: text("brand"),
    //  An unchecked checkbox isn't submitted at all.
    isFinalSale: formData.get("isFinalSale") === "on",
    status: text("status"),
    featured: formData.get("featured") === "on",
  };
}

/** Trimmed with inner spaces collapsed; blank is null. */
function optionalLine(value: string): string | null {
  return value.trim().replace(/\s+/g, " ") || null;
}

type Parsed = { ok: true; fields: ProductFields } | { ok: false; field?: ProductField; message: string };

function parseFields(values: ProductFormValues): Parsed {
  const name = values.name.trim();
  if (!name) return { ok: false, field: "name", message: "Enter a product name." };
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, field: "name", message: `Keep the name to ${MAX_NAME_LENGTH} characters or fewer.` };
  }

  const slug = values.slug.trim();
  const problem = slugProblem(slug);
  if (problem) return { ok: false, field: "slug", message: problem };

  // Normalized line endings so the length limit counts what's stored.
  const description = values.description.replace(/\r\n/g, "\n").trim();
  if (!description) return { ok: false, field: "description", message: "Enter a description." };
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      field: "description",
      message: `Keep the description to ${MAX_DESCRIPTION_LENGTH.toLocaleString("en-US")} characters or fewer.`,
    };
  }

  const collectionId = idSchema.safeParse(values.collectionId);
  if (!collectionId.success) return { ok: false, field: "collectionId", message: "Pick a collection." };

  const productTypeId = idSchema.safeParse(values.productTypeId);
  if (!productTypeId.success) return { ok: false, field: "productTypeId", message: "Pick a type." };

  const categoryId = values.categoryId === "" ? null : idSchema.safeParse(values.categoryId);
  if (categoryId && !categoryId.success) return { ok: false, message: "That request wasn't valid." };

  const optionNames = parseOptionPair(values.option1Name, values.option2Name);
  if (!optionNames.ok) {
    return { ok: false, field: "option1Name", message: "message" in optionNames ? optionNames.message : "Check the options." };
  }
  const [option1Name, option2Name] = optionNames.value;

  const material = optionalLine(values.material);
  if ((material?.length ?? 0) > MAX_MATERIAL_LENGTH) {
    return { ok: false, field: "material", message: `Keep the material to ${MAX_MATERIAL_LENGTH} characters or fewer.` };
  }

  const brand = optionalLine(values.brand);
  if ((brand?.length ?? 0) > MAX_BRAND_LENGTH) {
    return { ok: false, field: "brand", message: `Keep the brand to ${MAX_BRAND_LENGTH} characters or fewer.` };
  }

  return {
    ok: true,
    fields: {
      name,
      slug,
      description,
      collectionId: collectionId.data,
      productTypeId: productTypeId.data,
      categoryId: categoryId ? categoryId.data : null,
      option1Name,
      option2Name,
      material,
      brand,
      isFinalSale: values.isFinalSale,
    },
  };
}

// Names, slugs, and status show on the storefront and on stock and order pages.
function revalidateProducts() {
  revalidatePath("/adm/products", "layout");
  revalidatePath("/adm/inventory", "layout");
  revalidatePath("/products", "layout");
  revalidatePath("/"); // the homepage's featured pieces
}

export async function createProductAction(_prev: ProductActionState, formData: FormData): Promise<ProductActionState> {
  await requireStaff();
  const values = readValues(formData);
  const parsed = parseFields(values);
  if (!parsed.ok) return { ...parsed, values };

  const result = await createProduct(parsed.fields);
  if (!result.ok) return { ...result, values };

  revalidateProducts();
  // Next step is adding variants, on the product's own page.
  redirect(`/adm/products/${result.id}`);
}

export async function updateProductAction(_prev: ProductActionState, formData: FormData): Promise<ProductActionState> {
  await requireStaff();
  const values = readValues(formData);
  const productId = idSchema.safeParse(formData.get("productId"));
  const status = parseProductStatus(values.status);
  if (!productId.success || !status) return { ok: false, message: "That request wasn't valid.", values };

  const parsed = parseFields(values);
  if (!parsed.ok) return { ...parsed, values };

  const result = await updateProduct(productId.data, { ...parsed.fields, status, featured: values.featured });
  if (!result.ok) return { ...result, values };

  revalidateProducts();
  return { ok: true, message: "Saved." };
}
