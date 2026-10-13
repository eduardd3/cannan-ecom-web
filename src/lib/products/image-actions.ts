// lib/products/image-actions.ts
//
// Admin WRITE side for product images. Every export from a "use server" file
// is a public POST endpoint, so each one calls requireStaff() before anything
// else. The two upload steps are called directly from the upload form (the
// file goes to S3 in between); the rest are form actions.
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/session";
import type { UploadTarget } from "@/lib/storage";
import { normalizeAlt } from "./image-fields";
import {
  addProductImage,
  deleteProductImage,
  moveProductImage,
  requestImageUpload,
  updateProductImage,
  type ImageField,
} from "./images";

export type ImageActionState = { ok: true } | { ok: false; field?: ImageField; message: string } | null;

const INVALID = { ok: false, message: "That request wasn't valid." } as const;

const idSchema = z.coerce.number().int().positive();
// "" (no variant picked) is null.
const variantIdSchema = z.union([z.literal("").transform(() => null), idSchema]);

const uploadSchema = z.object({
  productId: idSchema,
  contentType: z.string().max(100),
  size: z.number().int().positive(),
});

const saveSchema = z.object({
  productId: idSchema,
  key: z.string().max(300),
  alt: z.string(),
  variantId: variantIdSchema,
});

const ALT_MESSAGE = "Describe the image in a few words (up to 200 characters).";

// Images show on the storefront grid and detail pages.
function revalidateImages() {
  revalidatePath("/adm/products", "layout");
  revalidatePath("/products", "layout");
}

/** Step 1 of an upload: a presigned URL for exactly this file's type and size. */
export async function requestImageUploadAction(
  input: z.input<typeof uploadSchema>,
): Promise<{ ok: true; target: UploadTarget } | Exclude<ImageActionState, null | { ok: true }>> {
  await requireStaff();
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  return requestImageUpload(parsed.data);
}

/** Step 2, after the browser's PUT succeeded: save the key on the product. */
export async function saveImageAction(input: z.input<typeof saveSchema>): Promise<ImageActionState> {
  await requireStaff();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  const alt = normalizeAlt(parsed.data.alt);
  if (!alt) return { ok: false, field: "alt", message: ALT_MESSAGE };

  const result = await addProductImage({ ...parsed.data, alt });
  if (!result.ok) return result;
  revalidateImages();
  return { ok: true };
}

export async function updateImageAction(_prev: ImageActionState, formData: FormData): Promise<ImageActionState> {
  await requireStaff();
  const imageId = idSchema.safeParse(formData.get("imageId"));
  const variantId = variantIdSchema.safeParse(formData.get("variantId") ?? "");
  if (!imageId.success || !variantId.success) return INVALID;
  const alt = normalizeAlt(String(formData.get("alt") ?? ""));
  if (!alt) return { ok: false, field: "alt", message: ALT_MESSAGE };

  const result = await updateProductImage(imageId.data, { alt, variantId: variantId.data });
  if (!result.ok) return result;
  revalidateImages();
  return { ok: true };
}

export async function moveImageAction(_prev: ImageActionState, formData: FormData): Promise<ImageActionState> {
  await requireStaff();
  const imageId = idSchema.safeParse(formData.get("imageId"));
  const direction = formData.get("direction");
  if (!imageId.success || (direction !== "up" && direction !== "down")) return INVALID;

  const result = await moveProductImage(imageId.data, direction);
  if (!result.ok) return result;
  revalidateImages();
  return { ok: true };
}

export async function deleteImageAction(_prev: ImageActionState, formData: FormData): Promise<ImageActionState> {
  await requireStaff();
  const imageId = idSchema.safeParse(formData.get("imageId"));
  if (!imageId.success) return INVALID;

  await deleteProductImage(imageId.data);
  revalidateImages();
  return { ok: true };
}
