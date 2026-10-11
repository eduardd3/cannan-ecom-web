import type { Metadata } from "next";

import PolicyPage from "@/app/components/policy-page";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Privacy | CANNAN",
  description: "What information Cannan collects, why, and how to control it.",
};

export default function Privacy() {
  return (
    <PolicyPage title="Privacy Policy" updated="October 8, 2026">
      <p>
        This policy explains what information CANNAN LLC (&quot;Cannan,&quot;
        &quot;we&quot;) collects when you use www.shopcannan.com, how we use it,
        and the choices you have.
      </p>

      <h2>Information we collect</h2>
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
          Stripe. Your card details go directly to Stripe and never reach or
          are stored on our servers.
        </li>
        <li>
          <strong>Technical information:</strong> your IP address, which is used
          briefly to protect sign-in and account forms from abuse.
        </li>
        <li>
          <strong>Messages:</strong> anything you send us by email.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To process, ship, and support your orders, including returns and refunds</li>
        <li>To run your account, including verifying your email and resetting your password</li>
        <li>To send emails about your account and orders</li>
        <li>To prevent fraud and keep the site secure</li>
        <li>To meet our legal, tax, and accounting obligations</li>
      </ul>
      <p>We do not send marketing emails unless you choose to receive them.</p>

      <h2>Who we share it with</h2>
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

      <h2>Cookies</h2>
      <p>
        We use a cookie to keep you signed in. We don&apos;t use advertising or
        analytics cookies. Stripe may set its own cookies during checkout to
        prevent fraud.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep account information while your account is open. We keep order
        records for as long as we need them for tax, accounting, and legal
        purposes.
      </p>

      <h2>Your choices and rights</h2>
      <p>
        You can ask us to tell you what personal information we hold about you,
        to correct it, or to delete it. California residents have these rights
        under the California Consumer Privacy Act. To make a request, email{" "}
        <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> from the address on your
        account. We won&apos;t treat you differently for using these rights.
      </p>

      <h2>Children</h2>
      <p>
        Our store is not directed to children under 13, and we don&apos;t
        knowingly collect their personal information.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy, we&apos;ll post the new version here and
        update the date above.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Email <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>.
      </p>
    </PolicyPage>
  );
}
