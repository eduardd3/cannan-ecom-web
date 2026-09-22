import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';    //  validate email/password shape before touching the DB
import bcrypt from 'bcryptjs';  //    hash the password, never store plaintext
import { prisma } from '@/lib/prisma'

//  Lives at /api/signup, not /api/auth/signup — the [...nextauth] catch-all
//  owns everything under /api/auth.
export async function POST(request: NextRequest) {

    let bdy: unknown;
    try {
        bdy = await request.json();
    }
    catch {
        return NextResponse.json({ error: 'Invalid JSON data'}, { status: 400});
    }

    const parsedBdy = z.object({email: z.email(),
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

        const newUser = await prisma.user.create ({data: {email, password: hashedPassword}});
        return NextResponse.json (newUser.email, {status: 201});   //  successfully creates customer
    }
    catch {
        return NextResponse.json({ error: 'Could not create account'}, { status: 500});
    }
}
