import { useState } from "react";
import { flushSync } from "react-dom";

export type ResendResult =
  | { kind: "sent" }
  | { kind: "already_verified" }
  //  The route's own wording, for callers that show it (ResendButton).
  | { kind: "cooldown"; serverMessage?: string }
  | { kind: "signed_out" }
  | { kind: "error" };

//  Request and in-flight state for /api/verification/send, with no wording or
//  styling: ResendButton (VerifyBanner) and the verify-email page each render
//  the result their own way.
export function useResendVerification() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ResendResult | null>(null);

  async function resend(): Promise<ResendResult> {
    setSending(true);
    setResult(null);
    let next: ResendResult;
    try {
      // No body — the server knows who you are from the session.
      const response = await fetch("/api/verification/send", { method: "POST" });
      const body = await response.json().catch(() => null);

      if (response.ok && body?.status === "sent") next = { kind: "sent" };
      else if (response.ok && body?.status === "already_verified") next = { kind: "already_verified" };
      //  The route has no IP limit, so 429 is always the 2-minute cooldown.
      else if (response.status === 429) next = { kind: "cooldown", serverMessage: body?.error };
      else if (response.status === 401) next = { kind: "signed_out" };
      else next = { kind: "error" };
    } catch {
      next = { kind: "error" };
    }
    //  Rendered by the time resend() resolves, so a caller can focus the
    //  banner showing the result.
    flushSync(() => {
      setResult(next);
      setSending(false);
    });
    return next;
  }

  return { resend, sending, result };
}
