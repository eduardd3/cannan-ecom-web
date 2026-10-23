import type { Metadata } from "next";
import Link from "next/link";

import PolicyTemplate from "@/app/components/policy/policy-template";
import type { PolicySection } from "@/app/components/policy/types";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Returns & Refunds | Cannan",
  description: "Cannan's return, refund, and replacement policy.",
  alternates: { canonical: "/returns" },
};

//  Same-page jumps use a plain <a>: nothing navigates, so next/link adds nothing.
const sections: PolicySection[] = [
  {
    id: "about-our-pieces",
    title: "About our pieces",
    content: (
      <p>
        Slight variations in paint, finish, and color are natural to our pieces
        and are not considered defects.
      </p>
    ),
  },
  {
    id: "canceling-an-order",
    title: "Canceling an order",
    content: (
      <>
        <p>
          You can cancel your order at any time before it ships. Email{" "}
          <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> with your order number,
          and we will refund the full amount. Once an order has shipped, it can
          be returned under &quot;<a href="#changed-your-mind">Changed your mind</a>.&quot;
        </p>
        <p>
          If an item becomes unavailable after you order it, we will notify you
          and refund that item in full.
        </p>
      </>
    ),
  },
  {
    id: "changed-your-mind",
    title: "Changed your mind",
    content: (
      <>
        <p>
          You may return an item for any reason within 30 days of delivery,
          provided it is unused and in its original condition.
        </p>
        <ul>
          <li>
            To start a return, email <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>{" "}
            before shipping anything. We respond with instructions within 1
            business day.
          </li>
          <li>Ship the item within 14 days of receiving our instructions.</li>
          <li>
            You are responsible for return shipping costs. Pack the item securely
            and use a tracked, insured shipping service. The item remains your
            responsibility until it reaches us.
          </li>
          <li>
            We do not offer exchanges. For a different size or item, return the
            original and place a new order.
          </li>
        </ul>
        <p>
          Items that have been used, worn, or damaged after delivery are not
          eligible for change-of-mind returns. If a return arrives used, damaged,
          or incomplete, we will either issue a partial refund or send the item
          back to you, at our discretion.
        </p>
        <p>
          Seasonal items are final sale. Items made for a specific holiday or
          season, such as Easter candles, are not eligible for change-of-mind
          returns and are marked as final sale on their product pages. They
          remain fully covered under &quot;
          <a href="#problems-with-your-order">Problems with your order</a>.&quot;
        </p>
      </>
    ),
  },
  {
    id: "problems-with-your-order",
    title: "Problems with your order",
    content: (
      <>
        <p>
          If your order arrives damaged, defective, incorrect, or incomplete,
          email <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> within 7 days of
          delivery. Include your order number and photos of the issue.
        </p>
        <p>
          If your package does not arrive, or tracking shows it as delivered but
          you cannot locate it, email us within 7 days of the estimated delivery
          date shown in your tracking, and we will follow up with the carrier.
        </p>
        <p>
          In every case, you choose between a replacement and a full refund. If a
          replacement is unavailable, we refund you in full.
        </p>
        <p>
          When we need an item returned, we provide a prepaid return label at no
          cost to you. Items broken beyond repair do not need to be returned.
        </p>
      </>
    ),
  },
  {
    id: "refunds",
    title: "Refunds",
    content: (
      <>
        <p>
          Refunds are issued to your original payment method and include the item
          price and the sales tax charged on it.
        </p>
        <ul>
          <li>
            <strong>Returns:</strong> issued within 1 business day of the item
            reaching us.
          </li>
          <li>
            <strong>Cancellations and order problems:</strong> issued within 1
            business day of confirmation.
          </li>
        </ul>
        <p>
          Your bank or card issuer may take several business days to post the
          refund to your account.
        </p>
      </>
    ),
  },
  {
    id: "questions",
    title: "Questions",
    content: (
      <p>
        For delivery details, see our <Link href="/shipping">Shipping policy</Link>.
        For anything else, email <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>.
      </p>
    ),
  },
];

export default function Returns() {
  return (
    <PolicyTemplate
      eyebrow="Help"
      title="Returns & Refunds"
      updated="October 16, 2026"
      lead={
        <p>
          This policy applies to orders placed on shopcannan.com. Orders placed
          through our marketplace shops follow that marketplace&apos;s return
          policy.
        </p>
      }
      sections={sections}
      crossLink={{
        label: "Delivery times and where we ship",
        linkText: "Shipping →",
        href: "/shipping",
      }}
    />
  );
}
