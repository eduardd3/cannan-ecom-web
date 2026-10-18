import 'server-only';
import type {ReactElement} from 'react';

import {Resend} from 'resend';
import {SENDER_ACCOUNT} from '@/lib/email/senders';
import {SUPPORT_EMAIL} from '@/lib/contact';

//  Created on first send, not at import: the Resend constructor throws when
//  the key is missing, which would 500 every route that imports this file.
let resend: Resend | null = null;

type SendArgs = {
    to: string | string[],
    subject: string,
    react: ReactElement,
    replyTo?: string,
    //  A sender address from ./senders; defaults to the account sender.
    from?: string,
    //  Resend drops a repeat send with the same key for 24 hours.
    idempotencyKey?: string,
    //  Extra MIME headers, e.g. internal details the recipient's mail client
    //  hides but "Show original" reveals.
    headers?: Record<string, string>,
};

export type SendResult = {ok: true, id: string } | {ok: false, error: string};
export async function sendEmail (args: SendArgs) : Promise<SendResult> {
    if (!process.env.RESEND_API_KEY) {
        console.error(`[email] RESEND_API_KEY is not set`);
        return {ok: false, error: 'Email send failed'};
    }
    resend ??= new Resend(process.env.RESEND_API_KEY);
    try {
        //  The mail. sending subdomain isn't a monitored inbox, so replies
        //  default to support unless a caller passes its own replyTo. Set after
        //  the spread so an explicit `replyTo: undefined` still gets it.
        const { from, idempotencyKey, ...message } = args;
        const { data, error } = await resend.emails.send(
            {
                ...message,
                from: `Cannan <${from ?? SENDER_ACCOUNT}>`,
                replyTo: args.replyTo ?? SUPPORT_EMAIL,
            },
            idempotencyKey ? { idempotencyKey } : undefined,
        );
        if (error || !data) {
            console.error(`[email] send failed`, error);
            return {ok: false, error: 'Email send failed'};
        }
        return { ok: true, id: data.id };
    } catch (error) {
        console.error(`[email] send threw`, error);
        return { ok: false, error: 'Email send failed'};
    }
}
