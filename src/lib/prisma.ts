// Single shared PrismaClient. Cached on globalThis in development so hot
// reloads do not exhaust the database connection limit.

import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { withVerifyFullSsl } from '@/lib/db-url';

const adapter = new PrismaPg({ connectionString: withVerifyFullSsl(process.env.DATABASE_URL) });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };


export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
