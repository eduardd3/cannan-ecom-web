import type { ReactNode } from "react";

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
      className="flex h-12 w-full cursor-pointer items-center justify-center rounded-[2px] bg-charcoal text-label-ui text-gallery-white transition-colors hover:bg-stone focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antique-gold disabled:pointer-events-none disabled:opacity-75"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
