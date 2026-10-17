import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass, type ButtonVariant } from "./styles";

type ButtonLinkProps = {
  href: string;
  variant?: ButtonVariant;
  children: ReactNode;
};

//  A link that looks like SubmitButton, for the /id state screens
//  ("Back to sign in", "Request a new link").
export default function ButtonLink({ href, variant, children }: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClass(variant)}>
      {children}
    </Link>
  );
}
