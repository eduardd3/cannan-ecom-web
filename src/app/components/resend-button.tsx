"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResendButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleResend() {
    setSending(true);
    setMessage(null);
    try {
      // No body — the server knows who you are from the session.
      const response = await fetch("/api/verification/send", { method: "POST" });
      const body = await response.json().catch(() => null);

      if (response.ok && body?.status === "sent") {
        setMessage("Sent! Check your inbox.");
      } else if (response.ok && body?.status === "already_verified") {
        setMessage("You're already verified.");
        router.refresh(); // re-renders the server banner, which now hides
      } else if (response.status === 429) {
        setMessage(body?.error ?? "Please wait a moment before trying again.");
      } else if (response.status === 401) {
        setMessage("Please sign in again.");
      } else {
        setMessage("Something went wrong. Try again shortly.");
      }
    } catch {
      setMessage("Something went wrong. Try again shortly.");
    } finally {
      setSending(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleResend}
        disabled={sending}
        aria-disabled={sending}
        className="font-semibold text-[#F2F3F4] underline underline-offset-2 hover:text-[#9AA1AB] disabled:opacity-50"
      >
        {sending ? "Sending…" : "Resend email"}
      </button>
      <span aria-live="polite">{message}</span>
    </span>
  );
}
