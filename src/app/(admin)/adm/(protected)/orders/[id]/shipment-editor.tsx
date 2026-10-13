"use client";

import { useActionState, useState, type ReactNode } from "react";

import type { Carrier } from "@/generated/prisma/enums";
import { updateTrackingAction, type FulfillActionState } from "@/lib/orders/actions";
import { PRIMARY_BUTTON, SECONDARY_BUTTON, ShipmentForm } from "./fulfill-form";

type Shipment = { carrier: Carrier; trackingNumber: string };

//  Mounted only while editing, so Cancel and reopening start clean instead
//  of showing the last failure.
function EditTrackingForm({
  orderId,
  shipment,
  onDone,
}: {
  orderId: number;
  shipment: Shipment;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(async (prev: FulfillActionState, formData: FormData) => {
    const result = await updateTrackingAction(prev, formData);
    if (result?.ok) onDone();
    return result;
  }, null);

  return (
    <ShipmentForm orderId={orderId} action={action} state={state} initial={shipment}>
      <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
        {pending ? "Saving…" : "Save"}
      </button>
      <button type="button" disabled={pending} onClick={onDone} className={SECONDARY_BUTTON}>
        Cancel
      </button>
    </ShipmentForm>
  );
}

/** The shipment summary (rendered on the server, passed as children) with an Edit toggle. */
export default function ShipmentEditor({
  orderId,
  shipment,
  children,
}: {
  orderId: number;
  shipment: Shipment;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <EditTrackingForm orderId={orderId} shipment={shipment} onDone={() => setEditing(false)} />;
  }
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      {children}
      <button type="button" onClick={() => setEditing(true)} className={SECONDARY_BUTTON}>
        Edit
      </button>
    </div>
  );
}
