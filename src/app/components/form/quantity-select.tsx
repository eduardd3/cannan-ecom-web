import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { controlBaseClass } from "./field";

type QuantitySelectProps = {
  value: number;
  //  The most the customer can choose, e.g. min(stock, MAX_QTY_PER_LINE).
  max: number;
  //  Read out as the select's name, e.g. "Quantity for Rosary". There's no
  //  visible label: the select sits inside its line.
  label: string;
  onChange: (quantity: number) => void;
  disabled?: boolean;
};

//  Compact native <select> for a cart line: SelectField's border, corners,
//  focus and chevron, without its label row or placeholder. Options run
//  1..max. A value above max (stock dropped below the cart quantity) gets one
//  extra disabled option, so the select still shows the real quantity and
//  every choice the customer can make is allowed.
export default function QuantitySelect({ value, max, label, onChange, disabled }: QuantitySelectProps) {
  const options = Array.from({ length: Math.max(1, max) }, (_, i) => i + 1);

  return (
    <div className="relative inline-block">
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className={`h-10 min-w-18 cursor-pointer appearance-none pr-8 pl-3 text-label-ui disabled:cursor-default disabled:opacity-60 ${controlBaseClass(undefined)}`}
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
        {value > max && (
          <option value={value} disabled>
            {value}
          </option>
        )}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-stone"
      />
    </div>
  );
}
