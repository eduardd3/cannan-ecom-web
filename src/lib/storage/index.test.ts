import { S3Client } from "@aws-sdk/client-s3";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Presigning is local HMAC work, so static fake credentials sign real URLs
// without touching AWS. Only the client is swapped; config stays real.
vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  const client = new S3Client({
    region: actual.storageConfig.region,
    credentials: { accessKeyId: "AKIATEST", secretAccessKey: "test-secret" },
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  return { ...actual, getS3Client: () => client };
});

import { createUploadUrl, deleteImage, getImageUrl, MAX_UPLOAD_BYTES } from "./index";

beforeEach(() => {
  vi.stubEnv("IMAGE_CDN_URL", "https://cdn.example.net/");
  vi.stubEnv("S3_BUCKET_NAME", "test-bucket");
  vi.stubEnv("S3_KEY_PREFIX", "dev");
});

describe("getImageUrl", () => {
  it("serves seed keys from public/seed-images", () => {
    expect(getImageUrl("products/virgen/1.jpg")).toBe("/seed-images/products/virgen/1.jpg");
  });

  it("serves bucket keys from the CDN, without a doubled slash", () => {
    expect(getImageUrl("dev/products/7/abc.webp")).toBe("https://cdn.example.net/dev/products/7/abc.webp");
  });

  it("rejects a key with a leading slash", () => {
    expect(() => getImageUrl("/products/virgen/1.jpg")).toThrow(/must not start with/);
  });

  it("needs IMAGE_CDN_URL only for bucket keys", () => {
    vi.stubEnv("IMAGE_CDN_URL", "");
    expect(getImageUrl("products/virgen/1.jpg")).toBe("/seed-images/products/virgen/1.jpg");
    expect(() => getImageUrl("dev/products/7/abc.webp")).toThrow(/IMAGE_CDN_URL is not set/);
  });
});

describe("createUploadUrl", () => {
  it("builds a prefixed key and signs type and size", async () => {
    const target = await createUploadUrl({ productId: 7, contentType: "image/png", size: 1234 });

    expect(target.key).toMatch(/^dev\/products\/7\/[0-9a-f-]{36}\.png$/);
    expect(target.headers).toEqual({
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    });

    const url = new URL(target.url);
    expect(url.hostname).toBe("test-bucket.s3.us-west-2.amazonaws.com");
    expect(url.pathname).toBe(`/${target.key}`);
    expect(url.searchParams.get("X-Amz-Expires")).toBe("60");
    const signed = url.searchParams.get("X-Amz-SignedHeaders")?.split(";");
    expect(signed).toEqual(expect.arrayContaining(["content-type", "content-length", "host"]));
    // An empty-body checksum in the URL would make S3 reject the real upload.
    expect(url.searchParams.has("x-amz-checksum-crc32")).toBe(false);
  });

  it("rejects disallowed content types", async () => {
    await expect(createUploadUrl({ productId: 7, contentType: "image/svg+xml", size: 10 })).rejects.toThrow(
      /not allowed/,
    );
  });

  it("rejects a malformed product id", async () => {
    for (const productId of [0, -1, 1.5, Number.NaN]) {
      await expect(createUploadUrl({ productId, contentType: "image/jpeg", size: 10 })).rejects.toThrow(
        /invalid product id/,
      );
    }
  });

  it("rejects empty and oversize files", async () => {
    for (const size of [0, MAX_UPLOAD_BYTES + 1]) {
      await expect(createUploadUrl({ productId: 7, contentType: "image/jpeg", size })).rejects.toThrow(/file size/);
    }
  });

  it("rejects a key prefix that isn't one path segment", async () => {
    vi.stubEnv("S3_KEY_PREFIX", "dev/../prod");
    await expect(createUploadUrl({ productId: 7, contentType: "image/jpeg", size: 10 })).rejects.toThrow(
      /S3_KEY_PREFIX/,
    );
  });
});

describe("deleteImage", () => {
  it("skips seed keys", async () => {
    await expect(deleteImage("products/virgen/1.jpg")).resolves.toBeUndefined();
  });

  it("refuses keys outside the env prefix", async () => {
    await expect(deleteImage("prod/products/7/abc.jpg")).rejects.toThrow(/outside the "dev\/" prefix/);
  });
});
