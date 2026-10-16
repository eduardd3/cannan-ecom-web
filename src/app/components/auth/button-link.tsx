import Link from "next/link";
import type { ReactNode } from "react";
import { primaryButtonClass } from "./styles";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
};

//  A link that looks like SubmitButton, for the /id state screens
//  ("Back to sign in", "Request a new link").
export default function ButtonLink({ href, children }: ButtonLinkProps) {
  return (
    <Link href={href} className={primaryButtonClass}>
      {children}
    </Link>
  );
}
