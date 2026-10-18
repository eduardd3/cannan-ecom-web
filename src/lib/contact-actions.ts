// Contact form submit. Every export from a "use server" file is a public POST
// endpoint, so only the action is exported; the schema and helpers stay
// private. No "server-only" here: the client form imports this file (Next
// swaps it for a reference), and the import would fail that build. The mail
// and secrets live behind lib/email/messages, which has it.
"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth-actions";
import { CONTACT_TOPIC_LABELS, CONTACT_TOPIC_VALUES } from "@/lib/contact";
import { sendContactEmail } from "@/lib/email/messages";
import { emailSchema } from "@/lib/normalize-email";
import { checkLimit, clientIp, contactDailyLimiter, contactLimiter } from "@/lib/rate-limit";

const FIELDS = ["name", "email", "orderNumber", "topic", "message"] as const;
export type ContactField = (typeof FIELDS)[number];
export type ContactValues = Record<ContactField, string>;

//  Failures echo the submitted values: React resets an uncontrolled form after
//  its action runs, and the form renders these as defaultValue so nothing typed
//  is lost. The honeypot is never echoed.
export type ContactState =
    | { status: "idle" }
    | { status: "sent" }
    | { status: "invalid"; values: ContactValues; fieldErrors: Partial<Record<ContactField, string>> }
    | { status: "rate-limited"; values: ContactValues }
    | { status: "send-failed"; values: ContactValues };

//  One message per field, whatever the rule that failed. Over-length is only
//  reachable past the inputs' maxLength, so it shares the empty message.
const FIELD_ERRORS: Record<ContactField, string> = {
    name: "Enter your name.",
    email: "Enter a valid email address.",
    orderNumber: "Enter digits only, like 1042.",
    topic: "Choose a topic.",
    message: "Write a message.",
};

const Body = z.object({
    //  Inner whitespace collapsed too: the name goes into the subject line.
    name: z.string().transform((s) => s.replace(/\s+/g, " ").trim()).pipe(z.string().min(1).max(100)),
    email: emailSchema,
    //  "#1042" and "1042" both become "1042"; blank becomes undefined. Never
    //  looked up: checking it would reveal which order numbers are real.
    orderNumber: z
        .string()
        .transform((s) => s.trim().replace(/^#/, ""))
        .pipe(z.union([z.literal("").transform(() => undefined), z.string().regex(/^\d{1,10}$/)])),
    topic: z.enum(CONTACT_TOPIC_VALUES),
    //  Browsers submit textarea line breaks as \r\n, but maxLength counts them
    //  as one character; normalize first so a full textarea isn't over 5000.
    message: z.string().transform((s) => s.replace(/\r\n?/g, "\n").trim()).pipe(z.string().min(1).max(5000)),
});

//  A missing field or a File reads as "", which then fails its own rule.
function readValues(formData: FormData): ContactValues {
    const get = (key: string) => {
        const v = formData.get(key);
        return typeof v === "string" ? v : "";
    };
    return Object.fromEntries(FIELDS.map((f) => [f, get(f)])) as ContactValues;
}

const SENT_AT = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "long",
    timeZone: "America/Los_Angeles",
});

export async function sendContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
    const values = readValues(formData);

    // 1. Before any other work, so throttled requests cost nothing.
    const ip = clientIp(await headers());
    const [burst, daily] = await Promise.all([
        checkLimit(contactLimiter, ip),
        checkLimit(contactDailyLimiter, ip),
    ]);
    if (!burst.ok || !daily.ok) return { status: "rate-limited", values };

    // 2. Real visitors never see this field. A bot gets the normal success
    //    state so it never learns it was caught.
    if (formData.get("website")) return { status: "sent" };

    // 3.
    const parsed = Body.safeParse(values);
    if (!parsed.success) {
        const fieldErrors: Partial<Record<ContactField, string>> = {};
        for (const issue of parsed.error.issues) {
            const field = issue.path[0] as ContactField;
            fieldErrors[field] = FIELD_ERRORS[field];
        }
        return { status: "invalid", values, fieldErrors };
    }
    const data = parsed.data;

    // 4–5. Awaited, not in after(): success means Resend accepted it, and on a
    //      failure the customer must be told so they can email us directly.
    //      (Forgot-password defers its send so timing can't reveal whether an
    //      account exists; nothing is looked up here, so nothing can leak.)
    const session = await auth();
    const result = await sendContactEmail({
        ...data,
        topic: CONTACT_TOPIC_LABELS[data.topic],
        sentAt: SENT_AT.format(new Date()),
        account: session?.user?.id ? { userId: session.user.id, email: session.user.email ?? null } : undefined,
    });
    if (!result.ok) return { status: "send-failed", values };

    return { status: "sent" };
}
