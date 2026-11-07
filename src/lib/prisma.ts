// Single shared PrismaClient per process, cached on globalThis in every
// environment: in development so hot reloads don't open a new pool each time,
// and in production so a warm function instance never builds a second one.

import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { withVerifyFullSsl } from '@/lib/db-url';

// Connections each function instance may hold open. pg's default is 10, and
// Vercel runs many instances at once, so the default multiplied out exhausted
// Prisma Postgres's connection limit in production. Pages run a handful of
// queries in parallel; past this cap they wait for a free connection rather
// than failing.
const POOL_MAX = 5;

// The integration-managed DATABASE_URL is the direct connection and can't be
// edited, so production sets DATABASE_POOLED_URL to the pooled one. Where it's
// unset (development, preview), DATABASE_URL is used as before.
const connectionString = process.env.DATABASE_POOLED_URL ?? process.env.DATABASE_URL;

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: withVerifyFullSsl(connectionString),
    max: POOL_MAX,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = (globalForPrisma.prisma ??= createPrismaClient());
