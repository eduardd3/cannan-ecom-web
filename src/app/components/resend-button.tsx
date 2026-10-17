"use client";

import { useRouter } from "next/navigation";
import { useResendVerification, type ResendResult } from "./use-resend-verification";

function messageFor(result: ResendResult) {
  switch (result.kind) {
    case "sent":
      return "Sent! Check your inbox.";
    case "already_verified":
      return "You're already verified.";
    case "cooldown":
      return result.serverMessage ?? "Please wait a moment before trying again.";
    case "signed_out":
      return "Please sign in again.";
    case "error":
      return "Something went wrong. Try again shortly.";
  }
}

//  The inline resend link in VerifyBanner.
export function ResendButton() {
  const router = useRouter();
  const { resend, sending, result } = useResendVerification();

  async function handleResend() {
    const next = await resend();
    if (next.kind === "already_verified") router.refresh(); // re-renders the server banner, which now hides
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleResend}
        disabled={sending}
        aria-disabled={sending}
        className="font-semibold text-charcoal underline underline-offset-2 hover:text-stone disabled:opacity-50"
      >
        {sending ? "Sending…" : "Resend email"}
      </button>
      <span aria-live="polite">{result && messageFor(result)}</span>
    </span>
  );
}
