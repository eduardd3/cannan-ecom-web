import type { Metadata } from "next";
import Link from "next/link";

import PolicyPage from "@/app/components/policy-page";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Shipping | CANNAN",
  description: "Free US shipping on every Cannan order.",
};

export default function Shipping() {
  return (
    <PolicyPage title="Shipping" updated="October 8, 2026">
      <h2>Free shipping on every order</h2>
      <p>Shipping is always free. There is no minimum order.</p>

      <h2>Where we ship</h2>
      <p>
        We ship within the United States, including Alaska, Hawaii, PO boxes, and
        APO/FPO military addresses. We don&apos;t ship internationally at this time.
      </p>

      <h2>Processing and carriers</h2>
      <ul>
        <li>Orders generally ship one business day after payment is received.</li>
        <li>We ship with USPS, UPS, or FedEx, depending on the order and destination.</li>
        <li>PO box and APO/FPO addresses ship with USPS.</li>
      </ul>

      <h2>Delivery times</h2>
      <p>
        Delivery time depends on the carrier and your location. Orders to Alaska,
        Hawaii, PO boxes, and APO/FPO addresses can take longer.
      </p>

      <h2>Problems with a delivery</h2>
      <p>
        If your order arrives damaged, see our{" "}
        <Link href="/returns">Returns &amp; Refunds</Link> policy and contact us
        within 7 days of delivery. For any other shipping question, email{" "}
        <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>.
      </p>
    </PolicyPage>
  );
}
