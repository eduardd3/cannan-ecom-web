import type { Metadata } from "next";
import Link from "next/link";

import PolicyPage from "@/app/components/policy-page";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Terms of Service | CANNAN",
  description: "The terms that apply when you use www.shopcannan.com and buy from Cannan.",
};

export default function Terms() {
  return (
    <PolicyPage title="Terms of Service" updated="October 8, 2026">
      <p>
        These terms apply when you use www.shopcannan.com or buy from CANNAN LLC
        (&quot;Cannan,&quot; &quot;we&quot;). By using the site or placing an
        order, you agree to them.
      </p>

      <h2>Orders and pricing</h2>
      <ul>
        <li>Prices are in US dollars. Applicable sales tax is calculated at checkout.</li>
        <li>
          An order is accepted once your payment is processed. We may cancel an
          order and fully refund it if an item becomes unavailable, or if a
          pricing or listing error was made.
        </li>
        <li>We try to describe and photograph products accurately, but colors and details may vary slightly.</li>
      </ul>

      <h2>Shipping, returns, and refunds</h2>
      <p>
        Our <Link href="/shipping">Shipping</Link> and{" "}
        <Link href="/returns">Returns &amp; Refunds</Link> policies are part of
        these terms.
      </p>

      <h2>Your account</h2>
      <p>
        You are responsible for keeping your password secure and for activity
        under your account. Please give us accurate information. We may suspend
        accounts that are used for fraud or abuse.
      </p>

      <h2>Privacy</h2>
      <p>
        Our <Link href="/privacy">Privacy Policy</Link> explains how we handle
        your information.
      </p>

      <h2>Site content</h2>
      <p>
        The Cannan name, logo, and site content belong to CANNAN LLC. Don&apos;t
        copy or reuse them without our permission.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent the law allows, our liability for any claim related to a
        purchase is limited to the amount you paid for that purchase. Nothing in
        these terms limits rights you have under consumer protection laws that
        can&apos;t be waived.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of the State of California.</p>

      <h2>Changes</h2>
      <p>
        We may update these terms. The version posted when you place an order
        applies to that order.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>.
      </p>
    </PolicyPage>
  );
}
