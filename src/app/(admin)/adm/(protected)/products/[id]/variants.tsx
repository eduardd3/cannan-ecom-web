"use client";

import Link from "next/link";
import { useActionState, useState, type InputHTMLAttributes } from "react";

import { formatCents } from "@/lib/cart/format";
import {
  createVariantAction,
  setVariantActiveAction,
  updateVariantAction,
  type VariantActionState,
  type VariantFormValues,
} from "@/lib/products/variant-actions";
import {
  formatPriceInput,
  MAX_OPENING_STOCK,
  MAX_OPTION_LENGTH,
  MAX_POSITION,
  MAX_SKU_LENGTH,
  type OptionNames,
} from "@/lib/products/variant-fields";
import type { VariantField } from "@/lib/products/variants";
import StockCount from "../../inventory/stock-count";

export type VariantRow = {
  id: number;
  sku: string;
  option1Value: string | null;
  option2Value: string | null;
  label: string | null;
  priceCents: number;
  stock: number;
  isActive: boolean;
  amazonAsin: string | null;
  position: number;
};

const FIELD =
  "w-full rounded-md border bg-adm-bg px-3 py-2 text-sm text-adm-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-muted";
const PRIMARY_BUTTON =
  "cursor-pointer rounded-md bg-adm-fg px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-adm-fg/85 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-muted";
const SECONDARY_BUTTON =
  "cursor-pointer rounded-md border border-adm-border px-3 py-1.5 text-sm text-adm-fg transition-colors hover:bg-adm-border disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-muted";

function valuesOf(variant: VariantRow): VariantFormValues {
  return {
    option1Value: variant.option1Value ?? "",
    option2Value: variant.option2Value ?? "",
    price: formatPriceInput(variant.priceCents),
    sku: variant.sku,
    amazonAsin: variant.amazonAsin ?? "",
    position: String(variant.position),
    openingStock: "",
  };
}

// ---------------------------------------------------------------------------
// Form (add and edit)
// ---------------------------------------------------------------------------

function Field({
  label,
  name,
  field,
  state,
  defaultValue,
  hint,
  className = "",
  ...input
}: {
  label: string;
  name: keyof VariantFormValues;
  field: VariantField;
  state: VariantActionState;
  defaultValue?: string;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const invalid = Boolean(state && !state.ok && state.field === field);
  return (
    <label className="flex flex-col gap-1 text-sm text-adm-muted">
      {label}
      <input
        name={name}
        defaultValue={defaultValue}
        aria-invalid={invalid}
        {...input}
        className={`${FIELD} ${invalid ? "border-red-500" : "border-adm-border"} ${className}`}
      />
      {hint && <span className="text-xs">{hint}</span>}
    </label>
  );
}

/**
 * Add (no `variant`) or edit a variant. A failure's echoed values win over
 * the saved ones: React resets the form after every action.
 */
function VariantForm({
  productId,
  optionNames,
  variant,
  onDone,
}: {
  productId: number;
  optionNames: OptionNames;
  variant?: VariantRow;
  onDone?: () => void;
}) {
  const editing = variant !== undefined;
  const [state, action, pending] = useActionState(async (prev: VariantActionState, formData: FormData) => {
    const result = await (editing ? updateVariantAction : createVariantAction)(prev, formData);
    if (result?.ok) onDone?.();
    return result;
  }, null);
  const values = state && !state.ok ? state.values : variant ? valuesOf(variant) : undefined;
  const optionInvalid = Boolean(state && !state.ok && state.field === "option");

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name={editing ? "variantId" : "productId"} value={editing ? variant.id : productId} />

      {/* Names come from the product's details; a product without them has one variant. */}
      {optionNames.option1Name ? (
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm text-adm-muted">Options</legend>
          <Field label={optionNames.option1Name} name="option1Value" field="option" state={state}
            defaultValue={values?.option1Value} required maxLength={MAX_OPTION_LENGTH} />
          {optionNames.option2Name && (
            <Field label={optionNames.option2Name} name="option2Value" field="option" state={state}
              defaultValue={values?.option2Value} required maxLength={MAX_OPTION_LENGTH} />
          )}
        </fieldset>
      ) : (
        <p className="text-sm text-adm-muted">
          This product has no options, so it has a single variant. Option names are set in the product details.
        </p>
      )}
      {optionInvalid && state && !state.ok && (
        <p role="alert" className="-mt-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Price (USD)" name="price" field="priceCents" state={state} defaultValue={values?.price}
          required inputMode="decimal" placeholder="24.99" />
        <Field label="SKU" name="sku" field="sku" state={state} defaultValue={values?.sku}
          required maxLength={MAX_SKU_LENGTH} spellCheck={false} autoComplete="off" className="font-mono" />
        <Field label="Amazon ASIN (optional)" name="amazonAsin" field="amazonAsin" state={state}
          defaultValue={values?.amazonAsin} maxLength={10} spellCheck={false} autoComplete="off" />
        <Field label="Position (optional)" name="position" field="position" state={state}
          defaultValue={values?.position} type="number" min={0} max={MAX_POSITION} step={1}
          hint={editing ? "Lower shows first." : "Blank adds it after the others."} />
        {!editing && (
          <Field label="Opening stock" name="openingStock" field="openingStock" state={state}
            defaultValue={values?.openingStock ?? "0"} type="number" min={0} max={MAX_OPENING_STOCK} step={1}
            hint="Recorded in the stock ledger. Later changes go through Inventory." />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
          {pending ? "Saving…" : editing ? "Save variant" : "Add variant"}
        </button>
        {onDone && editing && (
          <button type="button" disabled={pending} onClick={onDone} className={SECONDARY_BUTTON}>
            Cancel
          </button>
        )}
        {state && !state.ok && !optionInvalid && (
          <p role="alert" className="text-sm text-red-700">
            {state.message}
          </p>
        )}
        {state?.ok && !editing && (
          <p role="status" className="text-sm text-emerald-700">
            Variant added.
          </p>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

function ActiveToggle({ variant }: { variant: VariantRow }) {
  const [state, action, pending] = useActionState(setVariantActiveAction, null);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="variantId" value={variant.id} />
      <input type="hidden" name="active" value={String(!variant.isActive)} />
      <button type="submit" disabled={pending} className={SECONDARY_BUTTON}>
        {pending ? "Saving…" : variant.isActive ? "Turn off" : "Turn on"}
      </button>
      {state && !state.ok && (
        <p role="alert" className="max-w-56 text-right text-xs text-red-700">
          {state.message}
        </p>
      )}
    </form>
  );
}

const COLUMNS = 5;

function Row({ productId, optionNames, variant }: { productId: number; optionNames: OptionNames; variant: VariantRow }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <tr>
        <td colSpan={COLUMNS} className="bg-adm-bg px-6 py-4">
          <VariantForm productId={productId} optionNames={optionNames} variant={variant} onDone={() => setEditing(false)} />
        </td>
      </tr>
    );
  }
  return (
    <tr className={`align-top ${variant.isActive ? "" : "text-adm-muted"}`}>
      <td className="px-6 py-3">
        {variant.label ?? "Default"}
        {!variant.isActive && <span className="ml-2 text-xs">· off</span>}
        {variant.amazonAsin && <div className="font-mono text-xs text-adm-muted">ASIN {variant.amazonAsin}</div>}
      </td>
      <td className="px-4 py-3 font-mono text-xs">{variant.sku}</td>
      <td className="px-4 py-3 text-right tabular-nums">{formatCents(variant.priceCents)}</td>
      <td className="px-4 py-3 text-right">
        <Link href={`/adm/inventory/${variant.id}`} className="underline-offset-2 hover:underline" title="Stock history">
          <StockCount stock={variant.stock} />
        </Link>
      </td>
      <td className="px-6 py-3">
        <div className="flex items-start justify-end gap-2">
          <button type="button" onClick={() => setEditing(true)} className={SECONDARY_BUTTON}>
            Edit
          </button>
          <ActiveToggle variant={variant} />
        </div>
      </td>
    </tr>
  );
}

export default function Variants({
  productId,
  optionNames,
  variants,
}: {
  productId: number;
  optionNames: OptionNames;
  variants: VariantRow[];
}) {
  return (
    <>
      {variants.length === 0 ? (
        <p className="px-6 py-4 text-sm text-adm-muted">None yet. A product needs one before it can be listed.</p>
      ) : (
        <table className="mt-4 w-full text-left text-sm">
          <thead className="border-y border-adm-border text-adm-muted">
            <tr>
              <th className="px-6 py-3 font-medium">Variant</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 text-right font-medium">Stock</th>
              <th className="px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-adm-border text-adm-fg">
            {variants.map((variant) => (
              <Row key={variant.id} productId={productId} optionNames={optionNames} variant={variant} />
            ))}
          </tbody>
        </table>
      )}
      <details className="border-t border-adm-border px-6 py-4" open={variants.length === 0}>
        <summary className="cursor-pointer text-sm font-medium text-adm-fg">Add a variant</summary>
        <div className="mt-4">
          <VariantForm productId={productId} optionNames={optionNames} />
        </div>
      </details>
    </>
  );
}
