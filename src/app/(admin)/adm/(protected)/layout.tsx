import Link from "next/link";
import {redirect} from "next/navigation";
import {auth} from '@/lib/auth-actions';
import {isStaff} from '@/lib/roles';
import {signOutAdminAction} from '@/app/actions';

/**
 * Layout for authenticated admin pages, served at /adm/<name>.
 *
 * The login page at /adm/portal stays outside this group: guarding the layout
 * that renders it would redirect it to itself.
 *
 * Second of three checks — src/proxy.ts gates /adm at the edge, and admin
 * server actions call requireStaff() from @/lib/session.
 */
export default async function ProtectedAdminLayout ( {
    children,
}: Readonly <{
    children: React.ReactNode;
}>) {
    const session = await auth();
    // The null check is separate because isStaff is not a type guard and
    // would not narrow `session` for the header below.
    if (!session?.user || !isStaff(session.user.role)) redirect ("/adm/portal");

    return (
        <div className="flex min-h-dvh flex-col bg-adm-bg">
            {/* Admin chrome. Lives here rather than in (admin)/layout.tsx so the
                portal login page — which sits outside this group — doesn't get a
                sign-out bar it has no session for. */}
            <header className="flex shrink-0 items-center justify-between border-b border-adm-border bg-adm-surface px-5 py-3">
                <div className="flex items-center gap-6">
                    <Link href="/adm/dashboard" className="flex items-center gap-3">
                        <img
                            className="h-9"
                            src="/images/cannan-diamond-ink.svg"
                            alt="CANNAN"
                        />
                        <span className="font-bold text-adm-fg">Portal</span>
                    </Link>
                    <nav aria-label="Admin" className="flex items-center gap-4 text-sm">
                        <Link href="/adm/orders" className="text-adm-muted transition-colors hover:text-adm-fg">
                            Orders
                        </Link>
                        <Link href="/adm/inventory" className="text-adm-muted transition-colors hover:text-adm-fg">
                            Inventory
                        </Link>
                        <Link href="/adm/products" className="text-adm-muted transition-colors hover:text-adm-fg">
                            Products
                        </Link>
                        <Link href="/adm/categories" className="text-adm-muted transition-colors hover:text-adm-fg">
                            Categories
                        </Link>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <span className="hidden text-sm text-adm-muted sm:inline">
                        {session.user.email} · {session.user.role}
                    </span>
                    {/* POST, not a link — see the note in site-header.tsx */}
                    <form action={signOutAdminAction}>
                        <button
                            type="submit"
                            className="cursor-pointer rounded-md border border-adm-border px-3 py-1.5 text-sm text-adm-fg transition-colors hover:bg-adm-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-muted"
                        >
                            Sign out
                        </button>
                    </form>
                </div>
            </header>

            <main className="flex-1 p-6">{children}</main>
        </div>
    );
};
