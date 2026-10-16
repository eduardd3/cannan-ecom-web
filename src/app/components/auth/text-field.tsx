import type { ComponentProps, ReactNode } from "react";

type TextFieldProps = Omit<ComponentProps<"input">, "id"> & {
  id: string;
  label: string;
  //  Sits right-aligned in the label row, e.g. a "Forgot password?" link.
  labelAction?: ReactNode;
  helper?: string;
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
  endAdornment,
  className = "",
  ...inputProps
}: TextFieldProps) {
  const helperId = helper ? `${id}-helper` : undefined;

  return (
    <div className="flex flex-col gap-2 text-left">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-label-ui text-charcoal">
          {label}
        </label>
        {labelAction}
      </div>

      <div className="relative">
        {/* Focus shows as the gold border; no ring, no inner shadow. */}
        <input
          id={id}
          aria-describedby={helperId}
          className={`h-12 w-full rounded-[2px] border border-hairline bg-white px-4 text-body-md text-charcoal transition-colors focus:border-antique-gold focus:outline-none ${endAdornment ? "pr-11" : ""} ${className}`}
          {...inputProps}
        />
        {endAdornment}
      </div>

      {/* -mt-0.5 trims the column's 8px gap to the design's 6px. */}
      {helper && (
        <p id={helperId} className="-mt-0.5 text-caption text-stone">
          {helper}
        </p>
      )}
    </div>
  );
}
