// lib/seo/policies.ts
//
// The Shipping and Returns & Refunds policies as structured data, declared
// once on the Organization. Product-level markup overrides them (the
// final-sale Offer), and Merchant Center and Search Console settings
// override both. Change these together with the policy pages.

import type { MerchantReturnPolicy, ShippingService } from "schema-dts";

// Must equal shipping_address_collection.allowed_countries in
// lib/checkout/actions.ts: the markup describes what checkout accepts. A
// destination is always given; without one Google reads the conditions as
// worldwide.
export const SHIP_TO_COUNTRIES = ["US"] as const;

const BUSINESS_DAYS = [
  "https://schema.org/Monday",
  "https://schema.org/Tuesday",
  "https://schema.org/Wednesday",
  "https://schema.org/Thursday",
  "https://schema.org/Friday",
] as const;

function businessDays(minValue: number, maxValue: number) {
  return {
    "@type": "ServicePeriod" as const,
    businessDays: [...BUSINESS_DAYS],
    duration: { "@type": "QuantitativeValue" as const, minValue, maxValue, unitCode: "DAY" },
  };
}

// Free, ships within 1 business day of payment, arrives 3–5 business days
// after shipping.
export const SHIPPING_SERVICE: ShippingService = {
  "@type": "ShippingService",
  name: "Free shipping",
  fulfillmentType: "https://schema.org/FulfillmentTypeDelivery",
  handlingTime: businessDays(0, 1),
  shippingConditions: SHIP_TO_COUNTRIES.map((country) => ({
    "@type": "ShippingConditions" as const,
    shippingDestination: { "@type": "DefinedRegion" as const, addressCountry: country },
    shippingRate: { "@type": "MonetaryAmount" as const, value: 0, currency: "USD" },
    transitTime: businessDays(3, 5),
  })),
};

// 30 days, by mail. Customer pays return shipping for a change of mind; a
// damaged or defective item gets a prepaid label. The policy counts the 30
// days from delivery, which the schema can't express.
export const RETURN_POLICY: MerchantReturnPolicy = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: [...SHIP_TO_COUNTRIES],
  returnPolicyCountry: "US",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 30,
  returnMethod: "https://schema.org/ReturnByMail",
  customerRemorseReturnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
  itemDefectReturnFees: "https://schema.org/FreeReturn",
  itemDefectReturnLabelSource: "https://schema.org/ReturnLabelDownloadAndPrint",
  refundType: "https://schema.org/FullRefund",
};
