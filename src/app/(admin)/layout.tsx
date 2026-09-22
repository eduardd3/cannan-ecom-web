import {Metadata} from 'next';

//  Chrome + noindex for the whole admin area. Deliberately NOT a guard:
//  /adm/portal (the login page) renders inside this layout, so redirecting
//  unauthenticated users from here would bounce that page to itself forever.
//  The session check lives in adm/(protected)/layout.tsx, which the portal
//  sits outside of; proxy.ts + auth.config.ts gate the segment at the edge.
export const metadata: Metadata = {
    robots: {
        index: false
    }
};

export default function AdminLayout ( {
    children,
}: Readonly <{
    children: React.ReactNode;
}>) {
    return (
        //  min-h-dvh, not h-full: the root layout no longer supplies a parent
        //  with a resolved height, so a percentage height here would collapse
        //  and the portal page's flex-1 split would have nothing to stretch in.
        <div className="flex min-h-dvh flex-col">
            {children}
        </div>
    )
};
