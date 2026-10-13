// src/lib/storage/index.ts
//
// The app-facing interface. Product pages and admin actions import from here
// and never from client.ts or the AWS SDK directly.
//
// Not this module's job:
//   - Authorization: the calling server action checks the admin session.
//   - Database writes: the caller saves the returned key on ProductImage.

import "server-only";

import { randomUUID } from "node:crypto";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client, storageConfig } from "./client";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "./limits";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Dev seed images are committed under public/seed-images/ with keys like
// "products/<slug>/1.jpg". Bucket keys always start with the env prefix
// ("dev/products/...", "prod/products/..."), so the two can't collide.
// public/ is served from the site root, hence the seed-images folder:
// public/products/... would share URLs with the /products/[slug] route.
const SEED_PREFIX = "products/";
const SEED_BASE_URL = "/seed-images";

// Allowed types and the size cap live in limits.ts so the upload form can
// check them too.
export { MAX_UPLOAD_BYTES };

// Presigned URLs are used immediately after they're issued.
const UPLOAD_URL_TTL_SECONDS = 60;

// Safe only because every upload gets a brand-new key (random UUID below),
// so a cached object can never become stale.
const CACHE_CONTROL = "public, max-age=31536000, immutable";

function isSeedKey(key: string): boolean {
  return key.startsWith(SEED_PREFIX);
}

// ---------------------------------------------------------------------------
// getImageUrl
// ---------------------------------------------------------------------------

/**
 * Turns a stored key into a URL the browser can load.
 * Pure string work, no AWS call.
 */
export function getImageUrl(key: string): string {
  // Keys are relative by contract; a leading slash is bad data, so surface it.
  if (key.startsWith("/")) {
    throw new Error(`Storage: image key must not start with "/", got "${key}"`);
  }
  if (isSeedKey(key)) return `${SEED_BASE_URL}/${key}`;
  return `${storageConfig.cdnUrl}/${key}`;
}

function productFolder(productId: number): string {
  return `${storageConfig.keyPrefix}/products/${productId}/`;
}

/**
 * True only for a key createUploadUrl could have issued for this product:
 * this environment's prefix, this product's folder, a UUID, an allowed
 * extension. Lets the caller refuse a forged key before saving it.
 */
export function isProductUploadKey(key: string, productId: number): boolean {
  const folder = productFolder(productId);
  if (!key.startsWith(folder)) return false;
  const extensions = Object.values(ALLOWED_IMAGE_TYPES).join("|");
  return new RegExp(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:${extensions})$`).test(
    key.slice(folder.length),
  );
}

// ---------------------------------------------------------------------------
// createUploadUrl
// ---------------------------------------------------------------------------

export type UploadTarget = {
  url: string; // presigned PUT URL, valid for UPLOAD_URL_TTL_SECONDS
  key: string; // save this on ProductImage after the upload succeeds
  headers: Record<string, string>; // the browser MUST send exactly these
};

/**
 * Issues a short-lived permission for the browser to PUT one file to S3.
 * The server picks the key; the browser only supplies the file.
 *
 * `size` is signed into the URL as Content-Length, so S3 rejects a body of
 * any other size. fetch() sets Content-Length from the body itself, so the
 * browser doesn't send it explicitly.
 */
export async function createUploadUrl(params: {
  productId: number;
  contentType: string;
  size: number;
}): Promise<UploadTarget> {
  const { productId, contentType, size } = params;

  const ext = ALLOWED_IMAGE_TYPES[contentType];
  if (!ext) throw new Error(`Storage: content type "${contentType}" is not allowed`);

  if (!Number.isSafeInteger(productId) || productId <= 0) {
    throw new Error(`Storage: invalid product id ${productId}`);
  }
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
    throw new Error(`Storage: file size must be 1 to ${MAX_UPLOAD_BYTES} bytes, got ${size}`);
  }

  const key = `${productFolder(productId)}${randomUUID()}.${ext}`;

  // ContentType and ContentLength are part of the signature: a mismatched
  // header gets 403 SignatureDoesNotMatch. Content-Length is signed by
  // default; Content-Type is NOT unless listed in signableHeaders, and an
  // unsigned type would let an upload be stored (and served by the CDN) as
  // text/html. Cache-Control can't be signed (SigV4 treats it as unsignable),
  // so it's stored as whatever the browser sends; returning it in `headers`
  // keeps that consistent.
  const command = new PutObjectCommand({
    Bucket: storageConfig.bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
    CacheControl: CACHE_CONTROL,
  });
  const url = await getSignedUrl(getS3Client(), command, {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
    signableHeaders: new Set(["content-type"]),
  });

  return {
    url,
    key,
    headers: { "Content-Type": contentType, "Cache-Control": CACHE_CONTROL },
  };
}

// ---------------------------------------------------------------------------
// deleteImage
// ---------------------------------------------------------------------------

/**
 * Removes a file from S3. Idempotent: deleting a missing key succeeds.
 */
export async function deleteImage(key: string): Promise<void> {
  // Seed files live in the repo, not the bucket.
  if (isSeedKey(key)) return;

  // IAM would deny it anyway, but "key outside prefix" is far easier to
  // debug than AccessDenied.
  const { keyPrefix } = storageConfig;
  if (!key.startsWith(`${keyPrefix}/`)) {
    throw new Error(`Storage: key "${key}" is outside the "${keyPrefix}/" prefix`);
  }

  await getS3Client().send(new DeleteObjectCommand({ Bucket: storageConfig.bucket, Key: key }));
}
