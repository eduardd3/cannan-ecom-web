import type { Metadata } from "next";

import PolicyTemplate from "@/app/components/policy/policy-template";
import type { PolicySection } from "@/app/components/policy/types";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Privacy | Cannan",
  description: "What information Cannan collects, why, and how to control it.",
  alternates: { canonical: "/privacy" },
};

const sections: PolicySection[] = [
  {
    id: "information-we-collect",
    title: "Information we collect",
    content: (
      <ul>
        <li>
          <strong>Account information:</strong> your email address, your name if
          you provide it, and your password, which we store only in hashed form.
        </li>
        <li>
          <strong>Order information:</strong> the items you buy, your shipping
          address, your email address, and order totals.
        </li>
        <li>
          <strong>Payment information:</strong> payments are processed by
          Stripe, including Apple Pay, Google Pay, and Link. You enter card
          details in secure fields provided by Stripe on our checkout page;
          they go directly to Stripe and never reach or are stored on our
          servers. If you pay with a digital wallet, it shares the details
          needed for your order with us, such as your name, email, and
          shipping address. If you choose to save your details with Link,
          Stripe&apos;s privacy policy applies to that.
        </li>
        <li>
          <strong>Technical information:</strong> your IP address, which is used
          briefly to protect sign-in, account, and contact forms from abuse.
        </li>
        <li>
          <strong>Messages:</strong> anything you send us by email or through our contact form.
        </li>
      </ul>
    ),
  },
  {
    id: "how-we-use-it",
    title: "How we use it",
    content: (
      <>
        <ul>
          <li>To process, ship, and support your orders, including returns and refunds</li>
          <li>To run your account, including verifying your email and resetting your password</li>
          <li>To send emails about your account and orders</li>
          <li>To prevent fraud and keep the site secure</li>
          <li>To meet our legal, tax, and accounting obligations</li>
        </ul>
        <p>We do not send marketing emails unless you choose to receive them.</p>
      </>
    ),
  },
  {
    id: "who-we-share-it-with",
    title: "Who we share it with",
    content: (
      <>
        <p>
          We don&apos;t sell your personal information, and we don&apos;t share it
          for advertising. We share it only with the service providers that help us
          run the store, and only as needed for them to do so:
        </p>
        <ul>
          <li>Stripe, for payments, fraud prevention, and sales tax calculation</li>
          <li>Shipping carriers, such as USPS, UPS, and FedEx, to deliver your order</li>
          <li>Our hosting, database, and email providers, who store data and send email for us</li>
        </ul>
        <p>We may also disclose information when the law requires it.</p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    content: (
      <p>
        We use a cookie to keep you signed in. We don&apos;t use advertising or
        analytics cookies. Stripe may set its own cookies during checkout to
        prevent fraud.
      </p>
    ),
  },
  {
    id: "how-long-we-keep-it",
    title: "How long we keep it",
    content: (
      <p>
        We keep account information while your account is open. We keep order
        records for as long as we need them for tax, accounting, and legal
        purposes.
      </p>
    ),
  },
  {
    id: "your-choices-and-rights",
    title: "Your choices and rights",
    content: (
      <p>
        You can ask us to tell you what personal information we hold about you,
        to correct it, or to delete it. California residents have these rights
        under the California Consumer Privacy Act. To make a request, email{" "}
        <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> from the address on your
        account. We won&apos;t treat you differently for using these rights.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    content: (
      <p>
        Our store is not directed to children under 13, and we don&apos;t
        knowingly collect their personal information.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes",
    content: (
      <p>
        If we change this policy, we&apos;ll post the new version here and
        update the date above.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <p>
        Questions about privacy? Email <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>.
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <PolicyTemplate
      eyebrow="Legal"
      title="Privacy Policy"
      updated="October 26, 2026"
      lead={
        <p>
          This policy explains what information CANNAN LLC (&quot;Cannan,&quot;
          &quot;we&quot;) collects when you use www.shopcannan.com, how we use it,
          and the choices you have.
        </p>
      }
      sections={sections}
      crossLink={{
        label: "The terms for buying from us",
        linkText: "Terms of Service →",
        href: "/terms",
      }}
    />
  );
}
