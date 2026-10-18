import type { ComponentProps, ReactNode } from "react";
import Field, { controlClass, type FieldProps } from "./field";

type TextFieldProps = Omit<ComponentProps<"input">, "id"> &
  FieldProps & {
    //  Rendered inside the input's right edge (PasswordField's eye toggle).
    //  The input gets right padding so text never runs under it.
    endAdornment?: ReactNode;
  };

//  Label + input. Every other prop goes straight to the <input>, so name,
//  type, autoComplete, required, minLength, maxLength work as usual.
export default function TextField({
  id,
  label,
  optional,
  labelAction,
  helper,
  error,
  endAdornment,
  className = "",
  ...inputProps
}: TextFieldProps) {
  return (
    <Field id={id} label={label} optional={optional} labelAction={labelAction} helper={helper} error={error}>
      {(controlProps) => (
        <div className="relative">
          <input
            id={id}
            {...controlProps}
            className={`h-12 ${controlClass(error)} ${endAdornment ? "pr-11" : ""} ${className}`}
            {...inputProps}
          />
          {endAdornment}
        </div>
      )}
    </Field>
  );
}
