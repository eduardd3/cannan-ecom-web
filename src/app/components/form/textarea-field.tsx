import type { ComponentProps } from "react";
import Field, { controlClass, type FieldProps } from "./field";

type TextareaFieldProps = Omit<ComponentProps<"textarea">, "id"> & FieldProps;

//  Label + textarea, 6 rows tall and resizable vertically only. Every other
//  prop goes straight to the <textarea> (name, required, maxLength, ...).
export default function TextareaField({
  id,
  label,
  optional,
  labelAction,
  helper,
  error,
  rows = 6,
  className = "",
  ...textareaProps
}: TextareaFieldProps) {
  return (
    <Field id={id} label={label} optional={optional} labelAction={labelAction} helper={helper} error={error}>
      {(controlProps) => (
        <textarea
          id={id}
          rows={rows}
          {...controlProps}
          className={`block resize-y py-3.5 ${controlClass(error)} ${className}`}
          {...textareaProps}
        />
      )}
    </Field>
  );
}
