import Link from "next/link";
import { textLinkClass } from "@/app/components/form/styles";

//  A stone line ending in a gold-ink "Contact us" link, e.g. "Can't find an
//  order? Contact us". className is appended last for spacing.
export default function HelpLine({ lead, className = "" }: { lead: string; className?: string }) {
  return (
    <p className={`text-caption text-stone ${className}`}>
      {lead}{" "}
      <Link href="/contact" className={textLinkClass}>
        Contact us
      </Link>
    </p>
  );
}
