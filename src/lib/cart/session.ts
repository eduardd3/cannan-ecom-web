import "server-only";

import { cache } from "react";

import { auth } from "@/lib/auth-actions";

//  auth() runs the server-side jwt callback, which re-reads the user to check
//  sessionVersion: one DB query per call. The header and the page both need
//  the session, so cache() shares one auth() per request instead of two.
const getSession = cache(() => auth());

//  Our ids are positive Ints (see requireStaff); anything else is no session.
function parseUserId(id: string | undefined): number | null {
    const userId = Number(id);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
}

export async function getCurrentUserId(): Promise<number | null> {
    const session = await getSession();
    return parseUserId(session?.user?.id);
}

/** The signed-in user's id and email, or null. The email is the copy saved on the token at sign-in. */
export async function getCurrentUser(): Promise<{ id: number; email: string } | null> {
    const session = await getSession();
    const id = parseUserId(session?.user?.id);
    if (id === null || !session?.user?.email) return null;
    return { id, email: session.user.email };
}
