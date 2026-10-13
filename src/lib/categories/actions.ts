// lib/categories/actions.ts
//
// Admin WRITE side for categories. Every export from a "use server" file is a
// public POST endpoint, so each one calls requireStaff() before anything else.
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { slugProblem } from "@/lib/products/slug";
import { requireStaff } from "@/lib/session";
import { MAX_CATEGORY_DESCRIPTION_LENGTH, MAX_CATEGORY_NAME_LENGTH } from "./format";
import {
  createCategory,
  deleteCategory,
  updateCategory,
  type CategoryField,
  type CategoryFields,
} from "./save";

// The form's values as typed. A failure echoes them back: React resets the
// form after every action, so the form uses them as defaults.
export type CategoryFormValues = {
  name: string;
  slug: string;
  description: string;
};

export type CategoryActionState =
  | { ok: true; id: number; message: string }
  | { ok: false; field?: CategoryField; message: string; values: CategoryFormValues }
  | null;

export type DeleteCategoryState = { ok: false; message: string } | null;

const idSchema = z.coerce.number().int().positive();

function readValues(formData: FormData): CategoryFormValues {
  const text = (name: string) => String(formData.get(name) ?? "");
  return { name: text("name"), slug: text("slug"), description: text("description") };
}

type Parsed = { ok: true; fields: CategoryFields } | { ok: false; field?: CategoryField; message: string };

function parseFields(values: CategoryFormValues): Parsed {
  const name = values.name.trim();
  if (!name) return { ok: false, field: "name", message: "Enter a category name." };
  if (name.length > MAX_CATEGORY_NAME_LENGTH) {
    return { ok: false, field: "name", message: `Keep the name to ${MAX_CATEGORY_NAME_LENGTH} characters or fewer.` };
  }

  const slug = values.slug.trim();
  const problem = slugProblem(slug);
  if (problem) return { ok: false, field: "slug", message: problem };

  // Normalized line endings so the length limit counts what's stored.
  const description = values.description.replace(/\r\n/g, "\n").trim();
  if (description.length > MAX_CATEGORY_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      field: "description",
      message: `Keep the description to ${MAX_CATEGORY_DESCRIPTION_LENGTH.toLocaleString("en-US")} characters or fewer.`,
    };
  }

  return { ok: true, fields: { name, slug, description: description || null } };
}

// Categories show in the product form's picker and the storefront filter.
function revalidateCategories() {
  revalidatePath("/adm/categories", "layout");
  revalidatePath("/adm/products", "layout");
  revalidatePath("/products", "layout");
}

export async function createCategoryAction(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireStaff();
  const values = readValues(formData);
  const parsed = parseFields(values);
  if (!parsed.ok) return { ...parsed, values };

  const result = await createCategory(parsed.fields);
  if (!result.ok) return { ...result, values };

  revalidateCategories();
  return { ok: true, id: result.id, message: `Added "${parsed.fields.name}".` };
}

export async function updateCategoryAction(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireStaff();
  const values = readValues(formData);
  const categoryId = idSchema.safeParse(formData.get("categoryId"));
  if (!categoryId.success) return { ok: false, message: "That request wasn't valid.", values };

  const parsed = parseFields(values);
  if (!parsed.ok) return { ...parsed, values };

  const result = await updateCategory(categoryId.data, parsed.fields);
  if (!result.ok) return { ...result, values };

  revalidateCategories();
  return { ok: true, id: result.id, message: "Saved." };
}

export async function deleteCategoryAction(
  _prev: DeleteCategoryState,
  formData: FormData,
): Promise<DeleteCategoryState> {
  await requireStaff();
  const categoryId = idSchema.safeParse(formData.get("categoryId"));
  if (!categoryId.success) return { ok: false, message: "That request wasn't valid." };

  const result = await deleteCategory(categoryId.data);
  if (!result.ok) return result;

  revalidateCategories();
  redirect("/adm/categories");
}
