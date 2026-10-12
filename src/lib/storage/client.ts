// src/lib/storage/client.ts
//
// The ONLY file that knows how to talk to AWS. Everything provider-specific
// (credentials, region, SDK quirks) lives here, so switching providers later
// means rewriting this file and leaving index.ts mostly alone.

import "server-only"; // build fails if a client component imports this

import { S3Client } from "@aws-sdk/client-s3";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// Pinned in code rather than read from AWS_REGION: Vercel functions run on
// Lambda, which sets AWS_REGION to the function's execution region and
// overrides ours. The bucket's region is a fact about the bucket, not the
// deployment.
const BUCKET_REGION = "us-west-2";

// Read lazily, the first time a value is needed, never at import time:
// getImageUrl only needs IMAGE_CDN_URL, and pages that render seed images
// shouldn't crash because AWS vars are absent in some environment.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Storage: ${name} is not set`);
  return value;
}

export const storageConfig = {
  region: BUCKET_REGION,
  get roleArn() {
    return requireEnv("AWS_ROLE_ARN");
  },
  get bucket() {
    return requireEnv("S3_BUCKET_NAME");
  },
  // "dev" or "prod". Every key this app writes starts with `${keyPrefix}/`,
  // and the IAM role is scoped to that prefix.
  get keyPrefix() {
    const prefix = requireEnv("S3_KEY_PREFIX");
    if (!/^[a-z0-9-]+$/.test(prefix)) {
      throw new Error(`Storage: S3_KEY_PREFIX must be one lowercase path segment, got "${prefix}"`);
    }
    return prefix;
  },
  // CloudFront origin, without a trailing slash.
  get cdnUrl() {
    return requireEnv("IMAGE_CDN_URL").replace(/\/+$/, "");
  },
};

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

// Created once per server instance and reused across requests. This is safe
// even though the OIDC token isn't available at module level, because
// awsCredentialsProvider returns a function the SDK calls lazily, at request
// time. The SDK then caches the temporary STS credentials until near expiry.
//
// Locally, `vercel env pull` writes VERCEL_OIDC_TOKEN to .env.local. It
// expires after ~12 hours, so an AssumeRoleWithWebIdentity error in dev
// usually means re-pulling.
let client: S3Client | undefined;

export function getS3Client(): S3Client {
  client ??= new S3Client({
    region: storageConfig.region,
    // No `audience`: the default token audience is what the IAM OIDC provider
    // and both role trust policies expect.
    credentials: awsCredentialsProvider({ roleArn: storageConfig.roleArn }),
    // Otherwise the SDK signs a CRC32 checksum of an EMPTY body into presigned
    // URLs, and S3 rejects the real upload.
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  return client;
}
