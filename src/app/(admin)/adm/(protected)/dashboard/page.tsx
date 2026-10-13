import type { Metadata } from "next";
import Link from "next/link";
import { auth } from '@/lib/auth-actions';
import { countOrdersNeedingReview } from '@/lib/orders/queries';
import { requireStaff } from '@/lib/session';

export const metadata: Metadata = {
    title: "Dashboard | CANNAN Portal",
    robots: { index: false },
};

//  Chrome and the session guard both come from (protected)/layout.tsx.
//
//  Reading auth() here is fine for *display*. It is not an authorization check
//  — the JWT is a snapshot, so a demoted user still carries role ADMIN in their
//  token until it expires. Anything that reads or writes real data must call
//  requireStaff() from @/lib/session, which re-reads the row. That matters most
//  in server actions: those compile to public POST endpoints that can be hit
//  directly, without ever rendering this page or its guarded layout.
export default async function AdminDashboard() {
    await requireStaff();
    const [session, needsReview] = await Promise.all([auth(), countOrdersNeedingReview()]);

    return (
        <div className="mx-auto w-full max-w-5xl">
            <h1 className="text-2xl font-bold text-adm-fg">
                Dashboard
            </h1>
            <p className="mt-2 text-adm-muted">
                Signed in as {session?.user?.email}.
            </p>

            <div className="mt-8 rounded-xl border border-adm-border bg-adm-surface p-6">
                <h2 className="font-semibold text-adm-fg">Orders</h2>
                {needsReview > 0 ? (
                    <p className="mt-2 text-amber-700">
                        {needsReview === 1 ? "1 order needs" : `${needsReview} orders need`} review.{" "}
                        <Link href="/adm/orders?status=NEEDS_REVIEW" className="underline underline-offset-2">
                            Review now
                        </Link>
                    </p>
                ) : (
                    <p className="mt-2 text-adm-muted">No orders need review.</p>
                )}
                <Link href="/adm/orders" className="mt-3 inline-block text-sm text-adm-muted underline-offset-2 hover:underline">
                    All orders →
                </Link>
            </div>
        </div>
    );
}
