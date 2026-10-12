"use client";

import { useActionState, useState } from "react";

import { recordAdjustmentAction } from "@/lib/inventory/actions";
import {
  AMOUNT_LABEL,
  MANUAL_REASONS,
  MAX_MANUAL_UNITS,
  NOTE_REQUIRED,
  REASON_LABEL,
  type ManualReason,
} from "@/lib/inventory/manual";

const FIELD =
  "rounded-md border border-[#2A2F36] bg-[#0F1114] px-3 py-2 text-sm text-[#F2F3F4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9AA1AB]";

const NOTE_PLACEHOLDER: Record<ManualReason, string> = {
  RESTOCK: "Optional, e.g. supplier or shipment",
  CHANNEL_SALE_OTHER_PLATFORM: "e.g. Amazon order 113-1234567-1234567",
  MANUAL_RECOUNT: "e.g. Shelf count, found 2 damaged",
};

export default function AdjustForm({ variantId }: { variantId: number }) {
  const [state, action, pending] = useActionState(recordAdjustmentAction, null);
  // Drives the amount label and note rules. Submitted through the hidden
  // input: React resets the form after each action, which would clear a
  // named radio, but a hidden input's value survives a reset.
  const [reason, setReason] = useState<ManualReason>("RESTOCK");
  const fields = state && !state.ok ? state.fields : null;
  const noteRequired = NOTE_REQUIRED.has(reason);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="reason" value={reason} />

      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Reason</legend>
        {MANUAL_REASONS.map((value) => (
          <label
            key={value}
            className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#9AA1AB] ${
              reason === value
                ? "border-[#9AA1AB] bg-[#2A2F36] text-[#F2F3F4]"
                : "border-[#2A2F36] text-[#9AA1AB] hover:bg-[#2A2F36] hover:text-[#F2F3F4]"
            }`}
          >
            <input
              type="radio"
              name="reason-choice"
              value={value}
              checked={reason === value}
              onChange={() => setReason(value)}
              className="sr-only"
            />
            {REASON_LABEL[value]}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-sm text-[#9AA1AB]">
          {AMOUNT_LABEL[reason]}
          <input
            name="amount"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_MANUAL_UNITS}
            step={1}
            required
            defaultValue={fields?.amount}
            className={`${FIELD} w-32 tabular-nums`}
          />
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm text-[#9AA1AB]">
          Note{noteRequired ? "" : " (optional)"}
          <input
            name="note"
            type="text"
            maxLength={500}
            required={noteRequired}
            placeholder={NOTE_PLACEHOLDER[reason]}
            defaultValue={fields?.note}
            className={FIELD}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-md bg-[#F2F3F4] px-4 py-2 text-sm font-medium text-[#16191E] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9AA1AB]"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <p aria-live="polite" className="text-sm">
          {state?.ok && <span className="text-emerald-300">Saved. Stock is now {state.stockAfter}.</span>}
          {state && !state.ok && <span className="text-red-300">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
