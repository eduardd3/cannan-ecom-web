import type { Role } from '@/generated/prisma/client';

/**
 * Single definition of "staff", used by the proxy, the admin layout, and
 * requireStaff().
 *
 * Deliberately an allowlist: a missing or unrecognized role fails closed,
 * where a `role !== "CUSTOMER"` check would pass it.
 *
 * The Role import must stay type-only — auth.config.ts reaches this module
 * from the proxy, and a value import would bundle the Prisma runtime.
 */
export function isStaff(role: Role | undefined | null): boolean {
    return role === 'STAFF' || role === 'ADMIN';
}
