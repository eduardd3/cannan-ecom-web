import { NextResponse, after } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { TokenType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { consumeToken } from "@/lib/tokens";
import { sendPasswordChangedEmail } from "@/lib/email/messages";
import { checkLimit, clientIp, tokenLimiter, tooManyRequests } from "@/lib/rate-limit";

// Same minimum as signup and the credentials providers.
const Body = z.object({
    token: z.string().min(1).max(256),
    password: z.string().min(6),
});

// One message for unknown, expired, used, and wrong-type tokens.
const INVALID_LINK = "This reset link is invalid or has expired.";

export async function POST(req: Request) {
    // Before the bcrypt hash below, which runs even for a bogus token.
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
        const badToken = parsedBody.error.issues.some((issue) => issue.path[0] === "token");
        const error = badToken ? INVALID_LINK : "Password must be at least 6 characters.";
        return NextResponse.json({ error }, { status: 400 });
    }
    const { token, password } = parsedBody.data;

    // Hash outside the transaction so bcrypt doesn't hold it open.
    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));

    // Claim, password update, and sessionVersion bump commit together: a failed
    // update leaves the token unused, and a reused token changes nothing.
    const user = await prisma.$transaction(async (tx) => {
        const userId = await consumeToken(token, TokenType.PASSWORD_RESET, tx);
        if (userId === null) return null;

        // Any other outstanding reset link for this account dies with this one.
        await tx.token.updateMany({
            where: { userId, type: TokenType.PASSWORD_RESET, usedAt: null },
            data: { usedAt: new Date() },
        });

        return tx.user.update({
            where: { id: userId },
            // Bumping sessionVersion signs out every existing session.
            data: { password: hashedPassword, sessionVersion: { increment: 1 } },
            select: { email: true, name: true },
        });
    });

    if (!user) {
        return NextResponse.json({ error: INVALID_LINK }, { status: 400 });
    }

    after(async () => {
        const result = await sendPasswordChangedEmail(user);
        if (!result.ok) console.error("reset-password: confirmation email failed");
    });

    return NextResponse.json({ ok: true });
}
