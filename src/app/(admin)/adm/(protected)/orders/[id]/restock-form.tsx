"use client";

import { useActionState } from "react";

import { restockFromOrderAction } from "@/lib/orders/actions";

//  For a line the webhook couldn't fill: add units here, then approve.
export default function RestockForm({
  orderId,
  variantId,
  suggested,
}: {
  orderId: number;
  variantId: number;
  suggested: number;
}) {
  const [state, action, pending] = useActionState(restockFromOrderAction, null);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="variantId" value={variantId} />
      <label htmlFor={`restock-${variantId}`} className="sr-only">
        Units to restock
      </label>
      <input
        id={`restock-${variantId}`}
        name="quantity"
        type="number"
        min={1}
        step={1}
        defaultValue={suggested}
        required
        className="w-20 rounded-md border border-adm-border bg-adm-bg px-2 py-1 text-sm text-adm-fg tabular-nums"
      />
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-md border border-adm-border px-3 py-1 text-sm text-adm-fg transition-colors hover:bg-adm-border disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Saving…" : "Restock"}
      </button>
      {state && !state.ok && (
        <span role="alert" className="text-sm text-red-700">
          {state.message}
        </span>
      )}
    </form>
  );
}
