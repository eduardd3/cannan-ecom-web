"use client";

import { useActionState, type ReactNode } from "react";

import type { Carrier } from "@/generated/prisma/enums";
import { fulfillOrderAction, type FulfillActionState } from "@/lib/orders/actions";
import { CARRIER_LABEL, CARRIERS, MAX_TRACKING_LENGTH } from "@/lib/orders/shipping";

const FIELD =
  "rounded-md border border-adm-border bg-adm-bg px-3 py-2 text-sm text-adm-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-muted";

export const PRIMARY_BUTTON =
  "cursor-pointer rounded-md bg-adm-fg px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-adm-fg/85 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-muted";

export const SECONDARY_BUTTON =
  "cursor-pointer rounded-md border border-adm-border px-4 py-2 text-sm text-adm-fg transition-colors hover:bg-adm-border disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-muted";

/**
 * Carrier and tracking fields, shared by shipping and editing. A failed
 * submit's typed values win over `initial`: React resets the form after
 * every action, so without them a typo fix would start from scratch.
 */
export function ShipmentForm({
  orderId,
  action,
  state,
  initial,
  children,
}: {
  orderId: number;
  action: (formData: FormData) => void;
  state: FulfillActionState;
  initial?: { carrier: Carrier; trackingNumber: string };
  children: ReactNode; // the submit (and cancel) buttons
}) {
  const fields = state && !state.ok ? state.fields : initial;

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm text-adm-muted">
          Carrier
          <select name="carrier" defaultValue={fields?.carrier ?? "USPS"} className={FIELD}>
            {CARRIERS.map((carrier) => (
              <option key={carrier} value={carrier}>
                {CARRIER_LABEL[carrier]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm text-adm-muted">
          Tracking number
          <input
            name="trackingNumber"
            type="text"
            required
            autoComplete="off"
            spellCheck={false}
            // Room for the spaces USPS prints; they're stripped on save.
            maxLength={MAX_TRACKING_LENGTH * 2}
            defaultValue={fields?.trackingNumber}
            className={`${FIELD} font-mono`}
          />
        </label>
        <div className="flex gap-2">{children}</div>
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      )}
    </form>
  );
}

//  On success the page re-renders as FULFILLED and this form is gone, so
//  only failures need showing.
export default function FulfillForm({ orderId }: { orderId: number }) {
  const [state, action, pending] = useActionState(fulfillOrderAction, null);

  return (
    <ShipmentForm orderId={orderId} action={action} state={state}>
      <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
        {pending ? "Saving…" : "Mark shipped"}
      </button>
    </ShipmentForm>
  );
}
