import type { Metadata } from "next";
import Link from "next/link";

import PolicyTemplate from "@/app/components/policy/policy-template";
import type { PolicySection } from "@/app/components/policy/types";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Terms of Service | Cannan",
  description: "The terms that apply when you use www.shopcannan.com and buy from Cannan.",
  alternates: { canonical: "/terms" },
};

const sections: PolicySection[] = [
  {
    id: "orders-and-pricing",
    title: "Orders and pricing",
    content: (
      <ul>
        <li>Prices are in US dollars. Applicable sales tax is calculated at checkout.</li>
        <li>
          An order is accepted once your payment is processed. We may cancel an
          order and fully refund it if an item becomes unavailable, or if a
          pricing or listing error was made.
        </li>
        <li>We try to describe and photograph products accurately, but colors and details may vary slightly.</li>
      </ul>
    ),
  },
  {
    id: "shipping-returns-and-refunds",
    title: "Shipping, returns, and refunds",
    content: (
      <p>
        Our <Link href="/shipping">Shipping</Link> and{" "}
        <Link href="/returns">Returns &amp; Refunds</Link> policies are part of
        these terms.
      </p>
    ),
  },
  {
    id: "your-account",
    title: "Your account",
    content: (
      <p>
        You are responsible for keeping your password secure and for activity
        under your account. Please give us accurate information. We may suspend
        accounts that are used for fraud or abuse.
      </p>
    ),
  },
  {
    id: "privacy",
    title: "Privacy",
    content: (
      <p>
        Our <Link href="/privacy">Privacy Policy</Link> explains how we handle
        your information.
      </p>
    ),
  },
  {
    id: "site-content",
    title: "Site content",
    content: (
      <p>
        The Cannan name, logo, and site content belong to CANNAN LLC. Don&apos;t
        copy or reuse them without our permission.
      </p>
    ),
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of liability",
    content: (
      <p>
        To the extent the law allows, our liability for any claim related to a
        purchase is limited to the amount you paid for that purchase. Nothing in
        these terms limits rights you have under consumer protection laws that
        can&apos;t be waived.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law",
    content: <p>These terms are governed by the laws of the State of California.</p>,
  },
  {
    id: "changes",
    title: "Changes",
    content: (
      <p>
        We may update these terms. The version posted when you place an order
        applies to that order.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <p>
        Questions about these terms? Email <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>.
      </p>
    ),
  },
];

export default function Terms() {
  return (
    <PolicyTemplate
      eyebrow="Legal"
      title="Terms of Service"
      updated="October 16, 2026"
      lead={
        <p>
          These terms apply when you use www.shopcannan.com or buy from CANNAN LLC
          (&quot;Cannan,&quot; &quot;we&quot;). By using the site or placing an
          order, you agree to them.
        </p>
      }
      sections={sections}
      crossLink={{
        label: "How we handle your information",
        linkText: "Privacy Policy →",
        href: "/privacy",
      }}
    />
  );
}
