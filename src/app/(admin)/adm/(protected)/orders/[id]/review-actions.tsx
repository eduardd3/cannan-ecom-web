"use client";

import { useActionState } from "react";

import { approveOrderAction, refundOrderAction, type OrderActionState } from "@/lib/orders/actions";

const BUTTON =
  "cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9AA1AB]";

function Message({ state }: { state: OrderActionState }) {
  if (!state || state.ok) return null;
  return (
    <p role="alert" className="text-sm text-red-300">
      {state.message}
    </p>
  );
}

//  On success the page re-renders with the new status and this panel is gone,
//  so only failures need showing.
export default function ReviewActions({ orderId, refundLabel }: { orderId: number; refundLabel: string }) {
  const [approveState, approve, approving] = useActionState(approveOrderAction, null);
  const [refundState, refund, refunding] = useActionState(refundOrderAction, null);
  const busy = approving || refunding;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <form action={approve}>
          <input type="hidden" name="orderId" value={orderId} />
          <button type="submit" disabled={busy} className={`${BUTTON} bg-[#F2F3F4] text-[#16191E] hover:bg-white`}>
            {approving ? "Approving…" : "Approve"}
          </button>
        </form>
        <form
          action={refund}
          onSubmit={(event) => {
            if (!window.confirm(`Refund ${refundLabel} to the customer in Stripe? This can't be undone.`)) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="orderId" value={orderId} />
          <button
            type="submit"
            disabled={busy}
            className={`${BUTTON} border border-red-400/50 text-red-300 hover:bg-red-500/10`}
          >
            {refunding ? "Refunding…" : `Refund ${refundLabel}`}
          </button>
        </form>
      </div>
      <Message state={approveState} />
      <Message state={refundState} />
    </div>
  );
}
