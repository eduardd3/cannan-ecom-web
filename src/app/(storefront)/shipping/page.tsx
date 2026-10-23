import type { Metadata } from "next";
import Link from "next/link";

import PolicyTemplate from "@/app/components/policy/policy-template";
import type { PolicySection } from "@/app/components/policy/types";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Shipping | Cannan",
  description: "Free US shipping on every Cannan order.",
  alternates: { canonical: "/shipping" },
};

const sections: PolicySection[] = [
  {
    id: "free-shipping",
    title: "Free shipping",
    content: <p>Every order ships free, with no minimum.</p>,
  },
  {
    id: "where-we-ship",
    title: "Where we ship",
    content: (
      <p>
        We ship throughout the United States, including Alaska, Hawaii, US
        territories such as Puerto Rico, PO boxes, and APO/FPO military
        addresses. We do not ship internationally at this time.
      </p>
    ),
  },
  {
    id: "processing-and-carriers",
    title: "Processing and carriers",
    content: (
      <ul>
        <li>Orders ship within 1 business day of payment confirmation.</li>
        <li>
          We ship with USPS, UPS, or FedEx, depending on the order and
          destination. PO box and APO/FPO addresses ship with USPS.
        </li>
        <li>
          Most orders ship in a single package. If yours ships in more than one,
          we will let you know.
        </li>
        <li>
          When your order ships, we email you its tracking information. Tracking
          is also available in your order details.
        </li>
      </ul>
    ),
  },
  {
    id: "delivery-times",
    title: "Delivery times",
    content: (
      <p>
        Most orders arrive within 3–5 business days of shipping. Orders to
        Alaska, Hawaii, US territories, PO boxes, and APO/FPO addresses can take
        longer. Your tracking shows the estimated delivery date for your order.
      </p>
    ),
  },
  {
    id: "your-shipping-address",
    title: "Your shipping address",
    content: (
      <>
        <p>Review your shipping address carefully before placing your order.</p>
        <ul>
          <li>
            To change your address, email <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>{" "}
            before your order ships. You may also cancel the order and place a
            new one.
          </li>
          <li>
            If anything at your address could prevent delivery, such as a gate
            code, a parcel locker, or restricted building access, let us know by
            email before your order ships.
          </li>
          <li>
            If a package is returned to us because of an incorrect address, or
            because of a delivery obstacle we were not told about, you are
            responsible for the cost of reshipping it.
          </li>
          <li>
            We are not responsible for packages delivered to an incorrect address
            provided at checkout.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "problems-with-a-delivery",
    title: "Problems with a delivery",
    content: (
      <>
        <p>
          If your order arrives damaged, defective, incorrect, or incomplete, or
          if your package does not arrive, see &quot;
          <Link href="/returns#problems-with-your-order">Problems with your order</Link>
          &quot; in our Returns &amp; Refunds policy.
        </p>
        <ul>
          <li>
            <strong>Problems with a delivered order:</strong> report them within
            7 days of delivery.
          </li>
          <li>
            <strong>A package that does not arrive:</strong> report it within 7
            days of the estimated delivery date shown in your tracking.
          </li>
        </ul>
        <p>
          For any other shipping question, email{" "}
          <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>.
        </p>
      </>
    ),
  },
];

export default function Shipping() {
  return (
    <PolicyTemplate
      eyebrow="Help"
      title="Shipping"
      updated="October 16, 2026"
      sections={sections}
      crossLink={{
        label: "Returns, cancellations, and order problems",
        linkText: "Returns & Refunds →",
        href: "/returns",
      }}
    />
  );
}
