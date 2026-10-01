import { NextResponse } from "next/server";
import { z } from "zod";
import { TokenType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { consumeToken } from "@/lib/tokens";
import { checkLimit, clientIp, tokenLimiter, tooManyRequests } from "@/lib/rate-limit";

const Body = z.object({ token: z.string().min(1).max(256) });

// One message for unknown, expired, used, and wrong-type tokens.
const INVALID_LINK = "This link is invalid or has expired. You can request a new one from your account.";

export async function POST(req: Request) {
    const limit = await checkLimit(tokenLimiter, clientIp(req.headers));
    if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsedBody = Body.safeParse(body);
    if (!parsedBody.success) {
        return NextResponse.json({ error: INVALID_LINK }, { status: 400 });
    }
    const { token } = parsedBody.data;

    // Claim and verify commit together: a failed update leaves the token
    // unused, so the link still works on retry.
    let verified: boolean;
    try {
        verified = await prisma.$transaction(async (tx) => {
            const userId = await consumeToken(token, TokenType.EMAIL_VERIFICATION, tx);
            if (userId === null) return false;

            // emailVerified: null keeps the original timestamp if already verified.
            await tx.user.updateMany({
                where: { id: userId, emailVerified: null },
                data: { emailVerified: new Date() },
            });
            return true;
        });
    } catch (e) {
        console.error("verification/confirm: failed to confirm", e);
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    if (!verified) {
        return NextResponse.json({ error: INVALID_LINK }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
}
