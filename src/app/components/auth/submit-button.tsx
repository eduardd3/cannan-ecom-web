import type { ReactNode } from "react";
import { primaryButtonClass } from "./styles";

type SubmitButtonProps = {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
};

//  Full-width charcoal submit for the /id forms. pending comes from the form
//  (useActionState on sign-in, fetch state on sign-up), so this works for both.
//  No margin of its own: spacing belongs to the form.
export default function SubmitButton({ pending, pendingLabel, children }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={primaryButtonClass}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
