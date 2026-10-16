import type { ComponentProps, ReactNode } from "react";

type TextFieldProps = Omit<ComponentProps<"input">, "id"> & {
  id: string;
  label: string;
  //  Sits right-aligned in the label row, e.g. a "Forgot password?" link.
  labelAction?: ReactNode;
  helper?: string;
  //  Replaces the helper, turns the border muted red and marks the input
  //  aria-invalid. Only the reset form's "Passwords don't match." uses it.
  error?: string;
  //  Rendered inside the input's right edge (PasswordField's eye toggle).
  //  The input gets right padding so text never runs under it.
  endAdornment?: ReactNode;
};

//  Label + input for the /id forms. Every other prop goes straight to the
//  <input>, so name, type, autoComplete, required, minLength work as usual.
export default function TextField({
  id,
  label,
  labelAction,
  helper,
  error,
  endAdornment,
  className = "",
  ...inputProps
}: TextFieldProps) {
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-2 text-left">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-label-ui text-charcoal">
          {label}
        </label>
        {labelAction}
      </div>

      <div className="relative">
        {/* Focus shows as the gold border; no ring, no inner shadow. An error
            keeps its red border on focus so the state isn't lost. */}
        <input
          id={id}
          aria-describedby={errorId ?? helperId}
          aria-invalid={error ? true : undefined}
          className={`h-12 w-full rounded-[2px] border bg-white px-4 text-body-md text-charcoal transition-colors focus:outline-none ${error ? "border-error-ink" : "border-hairline focus:border-antique-gold"} ${endAdornment ? "pr-11" : ""} ${className}`}
          {...inputProps}
        />
        {endAdornment}
      </div>

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
