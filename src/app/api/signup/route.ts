import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';    //  validate email/password shape before touching the DB
import bcrypt from 'bcryptjs';  //    hash the password, never store plaintext
import { prisma } from '@/lib/prisma'
import { isSignupEnabled } from '@/lib/flags'
import { emailSchema } from '@/lib/normalize-email'
import { sendVerificationLink } from '@/lib/email/verification'
import { checkLimit, clientIp, signupLimiter, tooManyRequests } from '@/lib/rate-limit'
// import { sendWelcomeEmail } from '@/lib/email/messages';  // welcome email temporarily disabled

//  Lives at /api/signup, not /api/auth/signup — the [...nextauth] catch-all
//  owns everything under /api/auth.
export async function POST(request: NextRequest) {
    // 404 rather than 403: a closed endpoint should not advertise that it
    // exists and might reopen.
    if (!isSignupEnabled()) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const limit = await checkLimit(signupLimiter, clientIp(request.headers));
    if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

    let bdy: unknown;
    try {
        bdy = await request.json();
    }
    catch {
        return NextResponse.json({ error: 'Invalid JSON data'}, { status: 400});
    }

    const parsedBdy = z.object({email: emailSchema,
        password: z.string().min(6)
    }).safeParse(bdy)

    if (!parsedBdy.success) {   //  malformed email or password under 6 chars
        return NextResponse.json({ error: 'Invalid email or password'}, { status: 400});
    }

    const {email, password } = parsedBdy.data;

    try {
        const userExists = await prisma.user.findUnique({ where: {    email   }});
        if (userExists != null) {   //  reject user if email is registered
            return NextResponse.json({error: 'Email already in use!'}, { status: 403});
        }

        //  accept user if email isn't registered
        const sal = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, sal);   //  combined with password => hashed
        const customName = email.split('@')[0];

        const newUser = await prisma.user.create ({data: {email, password: hashedPassword, name: customName}});

        //  After the response: a failed send doesn't fail signup, and the user
        //  can resend from the banner once signed in.
        after(() => sendVerificationLink(newUser));

        // TODO: re-enable the welcome email (temporarily disabled).
        // await sendWelcomeEmail({email: newUser.email, name: newUser.name});
        return NextResponse.json (newUser.email, {status: 201});   //  successfully creates customer
    }
    catch {
        return NextResponse.json({ error: 'Could not create account'}, { status: 500});
    }
}
