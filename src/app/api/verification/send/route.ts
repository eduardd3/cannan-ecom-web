import { NextResponse, after } from "next/server";
import { TokenType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from '@/lib/auth-actions';
import { hasRecentToken } from "@/lib/tokens";
import { sendVerificationLink } from "@/lib/email/verification";

const COOLDOWN_MS = 2 * 60 * 1000;

export async function POST() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { id: Number(session.user.id) },
        select: { id: true, name: true, email: true, emailVerified: true },
    });

    if (!user) return NextResponse.json({ error: "Failed to get user by session" }, { status: 401 });

    if (user.emailVerified !== null) return NextResponse.json({ status: "already_verified" });

    // Unlike forgot-password, the caller is signed in and only learns about
    // their own account, so the cooldown can be stated outright.
    if (await hasRecentToken(user.id, TokenType.EMAIL_VERIFICATION, COOLDOWN_MS)) {
        return NextResponse.json(
            { error: "Please wait a couple of minutes before requesting another email." },
            { status: 429, headers: { "Retry-After": String(COOLDOWN_MS / 1000) } },
        );
    }

    after(() => sendVerificationLink(user));

    return NextResponse.json({ status: "sent" });
}
