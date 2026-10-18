import type { ComponentProps } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import Field, { controlClass, type FieldProps } from "./field";

export type SelectOption = { value: string; label: string };

//  No maxLength: a <select> ignores it, and its values are fixed by options.
type SelectFieldProps = Omit<ComponentProps<"select">, "id" | "children" | "multiple"> &
  FieldProps & {
    //  The disabled first option shown until a choice is made, e.g.
    //  "Select a topic…". Pass defaultValue="" (or value="") to start on it.
    placeholder: string;
    options: SelectOption[];
  };

//  Label + native <select>, so the keyboard and phone pickers work as usual.
//  appearance-none drops the browser's arrow for our chevron, which ignores
//  pointer events so clicks land on the select underneath.
export default function SelectField({
  id,
  label,
  optional,
  labelAction,
  helper,
  error,
  placeholder,
  options,
  className = "",
  ...selectProps
}: SelectFieldProps) {
  //  Stone while the placeholder shows, like an input's placeholder text. Only
  //  known for a controlled select; an uncontrolled one stays charcoal.
  const showingPlaceholder = selectProps.value === "";

  return (
    <Field id={id} label={label} optional={optional} labelAction={labelAction} helper={helper} error={error}>
      {(controlProps) => (
        <div className="relative">
          <select
            id={id}
            {...controlProps}
            className={`h-12 cursor-pointer appearance-none pr-11 ${controlClass(error)} ${showingPlaceholder ? "text-stone" : ""} ${className}`}
            {...selectProps}
          >
            <option value="" disabled>
              {placeholder}
            </option>
            {options.map(({ value, label }) => (
              <option key={value} value={value} className="text-charcoal">
                {label}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-stone"
          />
        </div>
      )}
    </Field>
  );
}
