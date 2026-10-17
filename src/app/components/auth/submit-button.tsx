import type { ReactNode } from "react";
import { buttonClass, type ButtonVariant } from "./styles";

type SubmitButtonProps = {
  pending: boolean;
  pendingLabel: string;
  variant?: ButtonVariant;
  children: ReactNode;
};

//  Full-width submit for the /id forms, charcoal unless variant says otherwise.
//  pending comes from the form (useActionState on sign-in, fetch state on
//  sign-up), so this works for both. No margin of its own: spacing belongs to
//  the form.
export default function SubmitButton({ pending, pendingLabel, variant, children }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass(variant)}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
