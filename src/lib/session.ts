import { auth } from '@/lib/auth-actions';
import { prisma } from '@/lib/prisma';
import { isStaff } from '@/lib/roles';

/**
 * Authorize an admin action. Call as the first statement of every one.
 *
 * Re-reads the user so a demotion takes effect before the JWT expires.
 *
 * @throws if the caller is not signed in, or is not staff.
 */
export async function requireStaff() {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    // Both credentials providers resolve a real row before returning, so this
    // is always our Int id. An OAuth provider's opaque id would overflow Int4.
    const user = await prisma.user.findUnique({ where: { id: Number(session.user.id) } });

    // Checked separately because isStaff is not a type guard and would leave
    // `user` nullable for callers.
    if (!user || !isStaff(user.role)) {
        throw new Error("Forbidden");
    }
    return user;
}