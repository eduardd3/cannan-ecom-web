import type { ReactNode } from "react";

//  The <dl> that holds SummaryRows: the cart's order summary and the
//  confirmation page's details box. className is appended last for spacing.
export function SummaryList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <dl className={`flex flex-col gap-3 ${className}`}>{children}</dl>;
}

//  Stone label on the left, charcoal value on the right. The value wraps
//  (break-words) so a long email address can't push past the panel.
export function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-body-md">
      <dt className="shrink-0 text-stone">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words text-charcoal">{value}</dd>
    </div>
  );
}
