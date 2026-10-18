import type { ReactNode } from "react";

//  The props every field component shares. Each one adds its own control's
//  native props (name, required, maxLength, ...) on top.
export type FieldProps = {
  id: string;
  label: string;
  //  Appends " (optional)" to the label, in stone.
  optional?: boolean;
  //  Sits right-aligned in the label row, e.g. a "Forgot password?" link.
  labelAction?: ReactNode;
  helper?: string;
  //  Replaces the helper, turns the border muted red and marks the control
  //  aria-invalid.
  error?: string;
};

//  Wired onto the control so screen readers read the helper or error with it.
export type FieldControlProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

//  Border, size and type shared by input, select and textarea. Focus shows as
//  the gold border; no ring, no inner shadow. An error keeps its red border on
//  focus so the state isn't lost.
export function controlClass(error: string | undefined) {
  return `w-full rounded-[2px] border bg-white px-4 text-body-md text-charcoal transition-colors focus:outline-none ${error ? "border-error-ink" : "border-hairline focus:border-antique-gold"}`;
}

//  Label row, control, and the helper or error below it. children renders the
//  control with the aria props it's given.
export default function Field({
  id,
  label,
  optional,
  labelAction,
  helper,
  error,
  children,
}: FieldProps & { children: (controlProps: FieldControlProps) => ReactNode }) {
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-2 text-left">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-label-ui text-charcoal">
          {label}
          {optional && <span className="font-normal text-stone"> (optional)</span>}
        </label>
        {labelAction}
      </div>

      {children({
        "aria-describedby": errorId ?? helperId,
        "aria-invalid": error ? true : undefined,
      })}

      {/* -mt-0.5 trims the column's 8px gap to the design's 6px. */}
      {error ? (
        <p id={errorId} className="-mt-0.5 text-caption text-error-ink">
          {error}
        </p>
      ) : (
        helper && (
          <p id={helperId} className="-mt-0.5 text-caption text-stone">
            {helper}
          </p>
        )
      )}
    </div>
  );
}
