import { NextResponse, after } from "next/server";
import { z } from "zod";
import { TokenType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { issueToken, hasRecentToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email/messages";
import { emailSchema } from "@/lib/normalize-email";
import { checkLimit, clientIp, forgotPasswordLimiter, tooManyRequests } from "@/lib/rate-limit";

const COOLDOWN_MS = 5 * 60 * 1000;
// Fixed origin, never derived from the Host header: a spoofed Host would
// otherwise send the victim a reset link pointing at the attacker's domain.
// Only `next dev` uses localhost; previews and production link to www.
const ORIGIN = process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://www.shopcannan.com";
const RESET_BASE_URL = `${ORIGIN}/id/reset-password`;

const Body = z.object({
    email: emailSchema,
});

export async function POST(req: Request) {
    // Keyed by IP, not email, so a 429 says nothing about whether the account
    // exists. The per-account cooldown below stays silent for the same reason.
    const limit = await checkLimit(forgotPasswordLimiter, clientIp(req.headers));
    if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsedBody = Body.safeParse(body);
    if (!parsedBody.success) {
        return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    const { email } = parsedBody.data;

    // Runs after the response is sent, so response timing doesn't reveal
    // whether the account exists.
    after(async () => {
        try {
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user || user.password === null) return;

            if (await hasRecentToken(user.id, TokenType.PASSWORD_RESET, COOLDOWN_MS)) return;

            const token = await issueToken(user.id, TokenType.PASSWORD_RESET);
            const url = `${RESET_BASE_URL}?token=${encodeURIComponent(token)}`;
            await sendPasswordResetEmail({ email: user.email, name: user.name }, url);
        } catch (e) {
            console.error("forgot-password: failed to process reset request", e);
        }
    });

    return NextResponse.json({ ok: true });
}
