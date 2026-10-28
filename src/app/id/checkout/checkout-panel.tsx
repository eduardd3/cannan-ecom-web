"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
    ExpressCheckoutElement,
    PaymentElement,
    ShippingAddressElement,
    type StripeCheckoutElementsValue,
} from "@stripe/react-stripe-js/checkout";
import type { StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import Link from "next/link";

import FormBanner from "@/app/components/form/form-banner";
import { buttonClass, textLinkClass } from "@/app/components/form/styles";
import { blockedDestination } from "@/lib/shipping/countries";
import CheckoutLayout from "./checkout-layout";
import { SummaryTotals, type CheckoutTotals, type SummaryLine } from "./order-summary";

type Checkout = StripeCheckoutElementsValue;

//  TODO(copy): shown in Shipping and Tax until Stripe can calculate them.
const PENDING_ADDRESS = "Calculated after address";

//  TODO(copy): for a territory Stripe's form offers but the policy excludes.
const notShipped = (place: string) => `We don't ship to ${place} yet.`;

//  Every amount is Stripe's own formatted string: the page must show the
//  session's live total, and it changes as the address (tax) comes in.
function totalsFrom(checkout: Checkout): CheckoutTotals {
    const { total, shipping, tax } = checkout;
    return {
        subtotal: total.subtotal.amount,
        shipping: shipping
            ? shipping.shippingOption.minorUnitsAmount === 0 ? "Free" : shipping.shippingOption.amount
            : PENDING_ADDRESS,
        tax: tax.status === "ready" ? total.taxExclusive.amount : PENDING_ADDRESS,
        total: total.total.amount,
    };
}

type CheckoutPanelProps = {
    checkout: Checkout;
    heading: ReactNode;
    lines: SummaryLine[];
    email: string;
};

export default function CheckoutPanel({ checkout, heading, lines, email }: CheckoutPanelProps) {
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const [hasWallets, setHasWallets] = useState(false);
    //  The excluded place the address form is set to, if any. Shown under the
    //  form as soon as it's picked, and checked again before paying.
    const [blockedPlace, setBlockedPlace] = useState<string | null>(null);
    const totals = totalsFrom(checkout);

    //  Move focus to the banner when an error appears, so keyboard and screen
    //  reader users land on it instead of hunting for what went wrong.
    const bannerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (error) bannerRef.current?.focus();
    }, [error]);

    //  The Pay button. Not disabled while fields are incomplete: confirm()
    //  then reports what's missing and Stripe marks the fields, which a
    //  greyed-out button can't explain. On success Stripe redirects to the
    //  return_url, so pending stays on until the page unloads.
    async function handlePay(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (pending) return;
        //  A browser-side check only; the webhook sends anything that gets
        //  past it to review.
        const place =
            blockedPlace ?? (checkout.shippingAddress && blockedDestination(checkout.shippingAddress.address)?.name);
        if (place) {
            setError(notShipped(place));
            return;
        }
        setError(null);
        setPending(true);
        const result = await checkout.confirm();
        if (result.type === "error") {
            setError(result.error.message);
            setPending(false);
        }
    }

    //  A wallet (Apple Pay, Google Pay) brings its own card and address, so
    //  it confirms on its own, without the form.
    async function handleExpressConfirm(event: StripeExpressCheckoutElementConfirmEvent) {
        //  The wallet's own address skips the form, so it's checked here.
        const blocked = event.shippingAddress && blockedDestination(event.shippingAddress.address);
        if (blocked) {
            event.paymentFailed({ reason: "invalid_shipping_address" });
            setError(notShipped(blocked.name));
            return;
        }
        setError(null);
        const result = await checkout.confirm({ expressCheckoutConfirmEvent: event });
        if (result.type === "error") setError(result.error.message);
    }

    return (
        <CheckoutLayout heading={heading} lines={lines} totals={totals}>
            <form onSubmit={handlePay} noValidate>
                <section aria-label="Express checkout">
                    <ExpressCheckoutElement
                        onConfirm={handleExpressConfirm}
                        onReady={(event) => setHasWallets(Boolean(event.availablePaymentMethods))}
                    />
                    {/* Only when at least one wallet showed up above it. */}
                    {hasWallets && (
                        // TODO(copy): wallet separator.
                        <p className="mt-6 text-center text-caption text-stone">Or pay with card</p>
                    )}
                </section>

                <Step title="Contact">
                    <p className="text-body-md text-stone">
                        Ordering as <span className="font-medium break-all text-charcoal">{email}</span>
                    </p>
                </Step>

                <Step title="Shipping address">
                    {/* Countries come from shipping_address_collection on the
                        session (SHIP_TO_COUNTRIES). Mounted before the Payment Element so
                        that one skips the billing fields it would repeat.
                        Stripe's state list also offers territories we don't
                        ship to, so those are flagged here. */}
                    <ShippingAddressElement
                        onChange={(event) => setBlockedPlace(blockedDestination(event.value.address)?.name ?? null)}
                    />
                    {blockedPlace && (
                        <div className="mt-4">
                            <FormBanner variant="error" action={{ href: "/shipping", label: "Shipping policy" }}>
                                {notShipped(blockedPlace)}
                            </FormBanner>
                        </div>
                    )}
                </Step>

                <Step title="Shipping method">
                    <ShippingMethod checkout={checkout} onError={setError} />
                </Step>

                <Step title="Payment">
                    {/* accordion: one row per method, matching the list rows.
                        Which methods appear is set in the Stripe Dashboard. */}
                    <PaymentElement options={{ layout: "accordion" }} />
                </Step>

                {error && (
                    <div className="mt-8">
                        <FormBanner variant="error" bannerRef={bannerRef}>{error}</FormBanner>
                    </div>
                )}

                {/* The summary panel is hidden below md, so the totals sit
                    right above Pay there. */}
                <SummaryTotals totals={totals} className="mt-9 md:hidden" />

                <button type="submit" disabled={pending} className={`mt-8 ${buttonClass()}`}>
                    {pending ? "Processing…" : `Pay ${totals.total}`}
                </button>

                {/* Agreement is to the Terms only: a privacy policy is a notice,
                    not something the customer agrees to. */}
                <p className="mt-4 text-caption text-stone">
                    By placing your order, you agree to our{" "}
                    <Link href="/terms" className={textLinkClass}>Terms of Service</Link>. Our{" "}
                    <Link href="/privacy" className={textLinkClass}>Privacy Policy</Link> explains how we
                    handle your information.
                </p>
            </form>
        </CheckoutLayout>
    );
}

function Step({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="mt-10 md:mt-12">
            <h2 className="mb-4 font-serif text-headline-md font-normal text-charcoal">{title}</h2>
            {children}
        </section>
    );
}

//  "4–6 business days" from Stripe's delivery estimate, or "Up to 6 business
//  days" when only a maximum is set.
function formatEstimate(option: Checkout["shippingOptions"][number]): string | null {
    const min = option.deliveryEstimate?.minimum;
    const max = option.deliveryEstimate?.maximum;
    if (!max) return null;
    const unit = `${max.unit.replace("_", " ")}${max.value === 1 ? "" : "s"}`;
    if (min && min.unit === max.unit && min.value < max.value) return `${min.value}–${max.value} ${unit}`;
    return `Up to ${max.value} ${unit}`;
}

//  Built from the session's shipping options, which our server sets
//  (buildShippingOptions). With one option there's nothing to choose, so it's
//  shown as already selected; with more, each row becomes a radio.
function ShippingMethod({ checkout, onError }: { checkout: Checkout; onError: (message: string) => void }) {
    const options = checkout.shippingOptions;
    const selectedId = checkout.shipping?.shippingOption.id ?? null;
    const choosable = options.length > 1;

    async function choose(id: string) {
        const result = await checkout.updateShippingOption(id);
        if (result.type === "error") onError(result.error.message);
    }

    if (options.length === 0) {
        // TODO(copy): no shipping options yet.
        return <p className="text-body-md text-stone">Enter your address to see shipping options.</p>;
    }

    return (
        <fieldset>
            <legend className="sr-only">Shipping method</legend>
            <ul className="flex flex-col gap-3">
                {options.map((option) => {
                    const selected = option.id === selectedId || !choosable;
                    const estimate = formatEstimate(option);
                    return (
                        <li key={option.id}>
                            <label
                                className={`flex items-center gap-4 rounded-control border bg-white p-4 transition-colors ${
                                    selected ? "border-antique-gold" : "cursor-pointer border-hairline hover:border-stone"
                                }`}
                            >
                                {choosable && (
                                    <input
                                        type="radio"
                                        name="shipping-option"
                                        checked={selected}
                                        onChange={() => choose(option.id)}
                                        className="size-4 accent-charcoal"
                                    />
                                )}
                                <span className="min-w-0 flex-1">
                                    <span className="block text-label-ui text-charcoal">{option.displayName ?? "Shipping"}</span>
                                    {estimate && <span className="mt-0.5 block text-caption text-stone">{estimate}</span>}
                                </span>
                                <span className="text-label-ui text-charcoal">
                                    {option.minorUnitsAmount === 0 ? "Free" : option.amount}
                                </span>
                            </label>
                        </li>
                    );
                })}
            </ul>
        </fieldset>
    );
}
