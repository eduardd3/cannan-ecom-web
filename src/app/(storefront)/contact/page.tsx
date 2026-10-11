import type { Metadata } from "next";
import Link from "next/link";

import PolicyPage from "@/app/components/policy-page";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Contact | CANNAN",
  description: "How to reach Cannan customer support.",
};

export default function ContactUs() {
  return (
    <PolicyPage title="Contact Us">
      <p>
        Questions about an order, a product, or a return? Email us at{" "}
        <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>. We handle all customer
        support by email and reply as soon as we can.
      </p>

      <h2>Help with an order</h2>
      <p>To help us find your order quickly, please include:</p>
      <ul>
        <li>The email address you used at checkout</li>
        <li>Your order number, if you have it</li>
        <li>Photos, if an item arrived damaged or defective</li>
      </ul>

      <h2>Returns and shipping</h2>
      <p>
        See our <Link href="/returns">Returns &amp; Refunds</Link> and{" "}
        <Link href="/shipping">Shipping</Link> policies. If an item arrived with a
        defect, contact us within 7 days of delivery.
      </p>

      <h2>Business information</h2>
      <p>CANNAN LLC, a California limited liability company.</p>
    </PolicyPage>
  );
}
