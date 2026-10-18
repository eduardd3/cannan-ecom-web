"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import FormBanner from "@/app/components/form/form-banner";
import SelectField from "@/app/components/form/select-field";
import SubmitButton from "@/app/components/form/submit-button";
import TextField from "@/app/components/form/text-field";
import TextareaField from "@/app/components/form/textarea-field";
import { textLinkClass } from "@/app/components/form/styles";
import { sendContactMessage, type ContactField, type ContactState } from "@/lib/contact-actions";
import { CONTACT_TOPICS, SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

//  Form order, so focus lands on the first invalid field from the top.
const FIELD_ORDER: ContactField[] = ["name", "email", "orderNumber", "topic", "message"];

const INITIAL: ContactState = { status: "idle" };

//  Only the email is prefilled. Signup sets `name` to the part of the email
//  before the @, which isn't the customer's name.
export default function ContactForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, formAction, pending] = useActionState(sendContactMessage, INITIAL);
  const sentHeadingRef = useRef<HTMLHeadingElement>(null);

  //  After a failure the action echoes what was sent. They become the inputs'
  //  defaultValue, so React's reset after the action puts them back.
  const values = "values" in state ? state.values : undefined;
  const fieldErrors = state.status === "invalid" ? state.fieldErrors : {};

  //  Controlled: the "damaged" helper and the placeholder's stone color both
  //  need the current topic.
  const [topic, setTopic] = useState(values?.topic ?? "");

  //  Runs once per submit result (each is a new object). Banners don't take
  //  focus: role="alert" already announces them.
  useEffect(() => {
    if (state.status === "sent") {
      sentHeadingRef.current?.focus();
    } else if (state.status === "invalid") {
      const first = FIELD_ORDER.find((f) => state.fieldErrors[f]);
      if (first) document.getElementById(first)?.focus();
    }
  }, [state]);

  if (state.status === "sent") {
    return (
      <div className="py-9 lg:py-12">
        <h2
          ref={sentHeadingRef}
          tabIndex={-1}
          className="mb-3 font-serif text-headline-lg font-normal text-charcoal outline-none"
        >
          Message sent
        </h2>
        <p className="mb-6 text-body-lg text-stone">Thank you. We&apos;ll reply by email within 1 business day.</p>
        <Link href="/products" className={`${textLinkClass} text-body-md`}>
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    //  noValidate: the server's messages are the only ones shown, the same in
    //  every browser. required stays on the fields for screen readers.
    <form action={formAction} noValidate aria-label="Contact form" className="relative flex flex-col gap-5">
      {state.status === "send-failed" && (
        <FormBanner variant="error">
          We couldn&apos;t send your message. Please try again, or email{" "}
          <a href={SUPPORT_MAILTO} className="underline underline-offset-4">
            {SUPPORT_EMAIL}
          </a>
          .
        </FormBanner>
      )}
      {state.status === "rate-limited" && (
        <FormBanner variant="error">Too many messages. Please try again later.</FormBanner>
      )}

      <TextField
        id="name"
        name="name"
        label="Name"
        placeholder="Your full name"
        autoComplete="name"
        required
        maxLength={100}
        defaultValue={values?.name}
        error={fieldErrors.name}
      />
      <TextField
        id="email"
        name="email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
        maxLength={254}
        defaultValue={values?.email ?? defaultEmail}
        helper="Use the email from your order, if it's about one."
        error={fieldErrors.email}
      />
      {/* Not type="number": that rejects "#1042", reports invalid text as an
          empty value, and adds spinners and scroll-to-change. inputMode still
          brings up the digit keypad on phones. 11 allows "#" plus 10 digits. */}
      <TextField
        id="orderNumber"
        name="orderNumber"
        label="Order number"
        optional
        inputMode="numeric"
        placeholder="e.g. 1042"
        autoComplete="off"
        maxLength={11}
        defaultValue={values?.orderNumber}
        helper="Found in your order confirmation email."
        error={fieldErrors.orderNumber}
      />
      <SelectField
        id="topic"
        name="topic"
        label="Topic"
        placeholder="Select a topic…"
        options={CONTACT_TOPICS}
        required
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        error={fieldErrors.topic}
      />
      <TextareaField
        id="message"
        name="message"
        label="Message"
        placeholder="How can we help?"
        required
        maxLength={5000}
        defaultValue={values?.message}
        helper={topic === "damaged" ? "We'll reply asking for photos of the issue." : undefined}
        error={fieldErrors.message}
      />

      {/* Honeypot. Off-screen rather than display:none (some bots skip hidden
          fields), out of the tab order and the accessibility tree, and
          autocomplete off so autofill can't drop a real customer's message. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="mt-2">
        <SubmitButton pending={pending} pendingLabel="Sending…">
          Send message
        </SubmitButton>
      </div>
    </form>
  );
}
