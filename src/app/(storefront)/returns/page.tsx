import type { Metadata } from "next";
import Link from "next/link";

import PolicyPage from "@/app/components/policy-page";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Returns & Refunds | CANNAN",
  description: "Cannan's return, refund, and replacement policy.",
};

export default function Returns() {
  return (
    <PolicyPage title="Returns & Refunds" updated="October 8, 2026">
      <p>
        Every item we sell is eligible for return. There are no final-sale items.
      </p>

      <h2>Changed your mind</h2>
      <p>
        You can return an item within 30 days of delivery for any reason, as long
        as it is in the same condition it arrived in.
      </p>
      <ul>
        <li>
          Email <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> to start a return
          before sending anything back.
        </li>
        <li>You are responsible for the cost of return shipping.</li>
        <li>
          Once we receive and inspect the item, we refund the purchase price to
          your original payment method.
        </li>
      </ul>

      <h2>Damaged or defective items</h2>
      <p>
        If an item arrives damaged or with a defect, email{" "}
        <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> within 7 days of delivery.
        Please include photos of the problem and your order details.
      </p>
      <ul>
        <li>We send you a prepaid return label, so returning the item costs you nothing.</li>
        <li>We ship you a replacement.</li>
        <li>
          If a replacement isn&apos;t available, we refund the purchase price to
          your original payment method instead.
        </li>
      </ul>

      <h2>Refund timing</h2>
      <p>
        We issue refunds after the returned item reaches us and passes
        inspection. Your bank or card issuer may take several business days to
        post the refund to your account.
      </p>

      <h2>Questions</h2>
      <p>
        See our <Link href="/shipping">Shipping policy</Link>, or email{" "}
        <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>.
      </p>
    </PolicyPage>
  );
}
