
import "server-only";

import { auth } from "@/lib/auth-actions";

export async function getCurrentUserId(): Promise<number | null> {
    const session = await auth();
    if (!session || !session.user?.id) return null
    const userId = Number(session.user.id)

    if (Number.isInteger(userId) && userId > 0) { 
        return userId;
    }
    else { 
        return null;    //  not signed in
    }
}