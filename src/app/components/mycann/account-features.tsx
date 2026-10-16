import Link from "next/link";

//  What a myCANN account does today. Only list what the code actually
//  supports: each card here was checked against the app before it went in.
//  TODO: add cards for saved delivery addresses and shipping-update emails
//  once those exist (neither does yet; Stripe collects the address on every
//  checkout, and the only order email is the confirmation).
//  TODO(copy): card titles and descriptions.
const FEATURES = [
  {
    title: "Order history & tracking",
    body: "See every order and its status, with a tracking number once it ships.",
  },
  {
    title: "Your cart, on any device",
    body: "Your cart is saved to your account, so it's there wherever you sign in.",
  },
  {
    //  Sent once the order is PAID, not while it's in review — hence "confirmed".
    title: "Order confirmation by email",
    body: "Your order details arrive in your inbox once your order is confirmed.",
  },
];

export default function AccountFeatures() {
  return (
    <section className="mt-14 border-t border-hairline pt-10 text-left">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-label-eyebrow text-gold-ink uppercase">Account features</h2>
        <Link
          href="/about-myCANN"
          className="text-caption text-stone underline decoration-hairline underline-offset-4 transition-colors hover:text-charcoal hover:decoration-stone"
        >
          What is myCANN?
        </Link>
      </div>

      {/* An odd last card spans both columns on sm+, so three cards don't
          leave an empty cell. */}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5">
        {FEATURES.map((feature) => (
          <li
            key={feature.title}
            className="rounded-[2px] border border-hairline bg-linen p-4 sm:last:odd:col-span-2"
          >
            <h3 className="mb-1 text-label-ui text-charcoal">{feature.title}</h3>
            <p className="text-caption text-stone">{feature.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
