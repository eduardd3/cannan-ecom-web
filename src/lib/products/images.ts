// lib/products/images.ts
//
// Product images: issuing upload URLs, saving uploaded keys, editing,
// reordering, and deleting. Server actions in ./image-actions call these after
// requireStaff(); keeping them here means they aren't public endpoints and can
// be tested against a real database.
//
// Upload flow: requestImageUpload → the browser PUTs the file straight to S3
// → addProductImage saves the row. The server never checks the object landed
// (the role has no s3:GetObject); a failed PUT never reaches the save step.
import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { createUploadUrl, deleteImage, isProductUploadKey, type UploadTarget } from "@/lib/storage";
import { MAX_IMAGES_PER_PRODUCT } from "./image-fields";

export type ImageField = "file" | "alt" | "variantId";

export type ImageResult = { ok: true; id: number } | { ok: false; field?: ImageField; message: string };

function fail(message: string, field?: ImageField): Extract<ImageResult, { ok: false }> {
  return { ok: false, field, message };
}

const FULL = `This product already has ${MAX_IMAGES_PER_PRODUCT} images. Delete one first.`;

/** Every write that changes a product's image list or order locks the product first. */
async function lockProduct(tx: Prisma.TransactionClient, productId: number) {
  const [row] = await tx.$queryRaw<{ id: number }[]>`
    SELECT "id" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`;
  return row !== undefined;
}

/** A variant can only be tagged on its own product's images. */
async function variantProblem(tx: Prisma.TransactionClient, productId: number, variantId: number | null) {
  if (variantId === null) return null;
  const variant = await tx.productVariant.findUnique({ where: { id: variantId }, select: { productId: true } });
  return variant?.productId === productId ? null : fail("That variant isn't on this product.", "variantId");
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export type UploadRequestResult = { ok: true; target: UploadTarget } | Extract<ImageResult, { ok: false }>;

/**
 * Permission for the browser to PUT one file. Checked here too (not only at
 * save) so a full product doesn't upload a file it can't keep.
 */
export async function requestImageUpload(params: {
  productId: number;
  contentType: string;
  size: number;
}): Promise<UploadRequestResult> {
  const product = await prisma.product.findUnique({
    where: { id: params.productId },
    select: { _count: { select: { images: true } } },
  });
  if (!product) return fail("This product no longer exists.");
  if (product._count.images >= MAX_IMAGES_PER_PRODUCT) return fail(FULL, "file");

  try {
    return { ok: true, target: await createUploadUrl(params) };
  } catch (err) {
    // Type and size were checked in the browser, so this is a forged request
    // or a storage misconfiguration (missing env vars, expired OIDC token).
    console.error("Upload URL failed", err instanceof Error ? err.message : err);
    return fail("Couldn't start the upload. Check the file and try again.", "file");
  }
}

/** Saves an uploaded file as the product's last image. */
export async function addProductImage(input: {
  productId: number;
  key: string;
  alt: string; // normalized
  variantId: number | null;
}): Promise<ImageResult> {
  // Only a key issued for this product in this environment; a forged one
  // could point the storefront at any file in the bucket.
  if (!isProductUploadKey(input.key, input.productId)) return fail("That upload isn't valid. Try again.", "file");

  return prisma.$transaction(async (tx) => {
    if (!(await lockProduct(tx, input.productId))) return fail("This product no longer exists.");
    const problem = await variantProblem(tx, input.productId, input.variantId);
    if (problem) return problem;

    const existing = await tx.productImage.aggregate({
      where: { productId: input.productId },
      _count: { _all: true },
      _max: { position: true },
    });
    if (existing._count._all >= MAX_IMAGES_PER_PRODUCT) return fail(FULL, "file");
    if (await tx.productImage.findFirst({ where: { key: input.key }, select: { id: true } })) {
      return fail("That upload was already saved.", "file");
    }

    const image = await tx.productImage.create({
      data: {
        productId: input.productId,
        key: input.key,
        alt: input.alt,
        variantId: input.variantId,
        position: (existing._max.position ?? -1) + 1,
      },
      select: { id: true },
    });
    return { ok: true, id: image.id };
  });
}

// ---------------------------------------------------------------------------
// Edit, reorder, delete
// ---------------------------------------------------------------------------

export async function updateProductImage(
  imageId: number,
  fields: { alt: string; variantId: number | null },
): Promise<ImageResult> {
  return prisma.$transaction(async (tx) => {
    const image = await tx.productImage.findUnique({ where: { id: imageId }, select: { productId: true } });
    if (!image) return fail("This image no longer exists.");
    const problem = await variantProblem(tx, image.productId, fields.variantId);
    if (problem) return problem;

    await tx.productImage.update({ where: { id: imageId }, data: fields });
    return { ok: true, id: imageId };
  });
}

/**
 * Swaps an image with its neighbor. Renumbers the whole list 0..n-1 while
 * at it, so ties (equal positions, e.g. from the seed) can't make a move a
 * no-op.
 */
export async function moveProductImage(imageId: number, direction: "up" | "down"): Promise<ImageResult> {
  return prisma.$transaction(async (tx) => {
    const image = await tx.productImage.findUnique({ where: { id: imageId }, select: { productId: true } });
    if (!image) return fail("This image no longer exists.");
    await lockProduct(tx, image.productId);

    // Same order the storefront uses.
    const ids = (
      await tx.productImage.findMany({
        where: { productId: image.productId },
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: { id: true },
      })
    ).map((row) => row.id);
    const from = ids.indexOf(imageId);
    const to = direction === "up" ? from - 1 : from + 1;
    if (to < 0 || to >= ids.length) return { ok: true, id: imageId }; // already at the end

    [ids[from], ids[to]] = [ids[to], ids[from]];
    await Promise.all(ids.map((id, position) => tx.productImage.update({ where: { id }, data: { position } })));
    return { ok: true, id: imageId };
  });
}

/**
 * Deletes the row, then the file. If the file delete fails the row is already
 * gone, so the storefront stops showing it; the orphaned object is left for
 * a cleanup job rather than failing the admin's delete.
 */
export async function deleteProductImage(imageId: number): Promise<ImageResult> {
  const image = await prisma.productImage.findUnique({ where: { id: imageId }, select: { key: true } });
  if (!image) return { ok: true, id: imageId }; // already gone

  // deleteMany: a concurrent delete of the same image isn't an error.
  await prisma.productImage.deleteMany({ where: { id: imageId } });
  // deleteImage skips seed keys: those files live in the repo.
  try {
    await deleteImage(image.key);
  } catch (err) {
    console.error(`Image ${imageId}: row deleted, file ${image.key} not`, err instanceof Error ? err.message : err);
  }
  return { ok: true, id: imageId };
}
