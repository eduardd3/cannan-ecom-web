import Link from "next/link";
import type { ReactNode } from "react";

type AuthBannerProps = {
  variant: "success" | "error";
  children: ReactNode;
  action?: { href: string; label: string };
};

const variants = {
  success: { role: "status", className: "border-gold-ink bg-linen text-charcoal" },
  error: { role: "alert", className: "border-error-ink bg-error-tint text-error-ink" },
} as const;

//  Text-only notice above an /id form: no icon, no close button. The action
//  link drops to its own line on mobile and sits right-aligned from md up.
export default function AuthBanner({ variant, children, action }: AuthBannerProps) {
  const { role, className } = variants[variant];

  return (
    <div
      role={role}
      className={`flex flex-col gap-1 border-l-2 px-4 py-3 text-left text-body-md md:flex-row md:items-center md:justify-between md:gap-4 ${className}`}
    >
      <p>{children}</p>
      {action && (
        <Link
          href={action.href}
          className="shrink-0 underline underline-offset-4 transition-opacity hover:opacity-80"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
