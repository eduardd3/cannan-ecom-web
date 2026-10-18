import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import Container from "@/app/components/container";
import PageHeading from "@/app/components/page-heading";
import { textLinkClass } from "@/app/components/form/styles";
import { auth } from "@/lib/auth-actions";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";
import ContactForm from "./contact-form";

export const metadata: Metadata = {
  title: "Contact | Cannan",
  description: "Send Cannan a message about an order, a product, or a return.",
  alternates: { canonical: "/contact" },
};

function SupportBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border-b border-hairline/60 pb-6 last:border-b-0 last:pb-0 lg:pb-7">
      <h2 className="mb-2.5 text-label-eyebrow text-stone uppercase">{label}</h2>
      <div className="text-body-md text-charcoal">{children}</div>
    </section>
  );
}

//  Reads the session only to prefill the email, which makes this page render
//  per request instead of statically.
export default async function ContactPage() {
  const session = await auth();

  return (
    <Container className="pt-12 pb-16 md:pt-18 md:pb-24">
      <header className="mb-9 md:mb-16">
        <PageHeading eyebrow="Help" title="Contact us" subtitle="Aquí para ayudarte" />
        <p className="mx-auto -mt-1 max-w-135 text-center text-body-lg text-charcoal">
          Questions about an order, a piece, or a return? Send us a message, or email{" "}
          <a href={SUPPORT_MAILTO} className={textLinkClass}>
            {SUPPORT_EMAIL}
          </a>
          . We reply within 1 business day.
        </p>
      </header>

      {/* lg, not md: 560px form + 72px gap + 260px support column don't fit
          the ~704px content area at md, so it stays one column until lg. */}
      <div className="mx-auto max-w-140 lg:grid lg:max-w-none lg:grid-cols-[minmax(0,560px)_minmax(260px,320px)] lg:items-start lg:justify-center lg:gap-18">
        <ContactForm defaultEmail={session?.user?.email ?? undefined} />

        <aside
          aria-label="More ways to get help"
          className="mt-13 flex flex-col gap-6 border-t border-hairline/60 pt-9 lg:mt-0 lg:gap-7 lg:border-t-0 lg:pt-1"
        >
          <SupportBlock label="Track an order">
            <p>Order details and tracking are in your account.</p>
            <Link href="/purchases" className={`${textLinkClass} mt-2 inline-block`}>
              Your orders
            </Link>
          </SupportBlock>
          <SupportBlock label="Order problems">
            <p>Report damaged, defective, incorrect, or incomplete orders within 7 days of delivery.</p>
            <div className="mt-2 flex gap-4">
              <Link href="/returns" className={textLinkClass}>
                Returns &amp; Refunds
              </Link>
              <Link href="/shipping" className={textLinkClass}>
                Shipping
              </Link>
            </div>
          </SupportBlock>
          <SupportBlock label="Business">
            <p>CANNAN LLC · California</p>
          </SupportBlock>
        </aside>
      </div>
    </Container>
  );
}
