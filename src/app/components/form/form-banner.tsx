import Link from "next/link";
import type { ReactNode, Ref } from "react";

//  A link navigates; a button triggers a request (e.g. resending a link), so it
//  gets its own disabled state while that request is in flight.
export type FormBannerAction =
  | { label: string; href: string }
  | { label: string; onClick: () => void; disabled?: boolean };

type FormBannerProps = {
  variant: "success" | "error";
  children: ReactNode;
  action?: FormBannerAction;
  //  Lets a form move focus to the banner when it appears, so keyboard users
  //  land next to its action. Makes it programmatically focusable only.
  bannerRef?: Ref<HTMLDivElement>;
};

const variants = {
  success: { role: "status", className: "border-gold-ink bg-linen text-charcoal" },
  error: { role: "alert", className: "border-error-ink bg-error-tint text-error-ink" },
} as const;

const actionClass =
  "shrink-0 cursor-pointer text-left underline underline-offset-4 transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-60";

//  Text-only notice above a form: no icon, no close button. The action
//  drops to its own line on mobile and sits right-aligned from md up.
export default function FormBanner({ variant, children, action, bannerRef }: FormBannerProps) {
  const { role, className } = variants[variant];

  return (
    <div
      ref={bannerRef}
      role={role}
      tabIndex={bannerRef ? -1 : undefined}
      className={`flex flex-col gap-1 border-l-2 px-4 py-3 text-left text-body-md outline-none md:flex-row md:items-center md:justify-between md:gap-4 ${className}`}
    >
      <p>{children}</p>
      {action &&
        ("href" in action ? (
          <Link href={action.href} className={actionClass}>
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={actionClass}
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}
