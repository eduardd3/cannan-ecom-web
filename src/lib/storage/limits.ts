// src/lib/storage/limits.ts
//
// Upload limits, with no server imports, so the upload form can check a file
// before asking for an upload URL. index.ts enforces the same values.

// Content type -> file extension. The extension is DERIVED from the type,
// never taken from the uploaded filename, so the key can't lie about the file.
// No image/svg+xml: SVGs can contain scripts.
export const ALLOWED_IMAGE_TYPES: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
