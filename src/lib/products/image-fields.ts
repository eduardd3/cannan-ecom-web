// lib/products/image-fields.ts
//
// Pure rules for product images. No server imports: the upload form checks
// files and alt text with these before anything is sent.

import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/storage/limits";

export const MAX_IMAGES_PER_PRODUCT = 12;
export const MAX_ALT_LENGTH = 200;

/** Alt text as saved: trimmed, spaces collapsed. Null if blank or too long. */
export function normalizeAlt(value: string): string | null {
  const alt = value.trim().replace(/\s+/g, " ");
  return alt.length > 0 && alt.length <= MAX_ALT_LENGTH ? alt : null;
}

/** Why a picked file can't be uploaded, or null if it can. */
export function fileProblem(file: { type: string; size: number }): string | null {
  if (!(file.type in ALLOWED_IMAGE_TYPES)) return "Use a JPEG, PNG, or WebP image.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_UPLOAD_BYTES) {
    return `Images can be up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB; that one is ${(file.size / 1024 / 1024).toFixed(1)} MB.`;
  }
  return null;
}

export const ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_IMAGE_TYPES).join(",");
