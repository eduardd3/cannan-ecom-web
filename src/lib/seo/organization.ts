// lib/seo/organization.ts
//
// The homepage's structured data: the WebSite (which site name Google shows)
// and the Organization that carries the site-wide shipping and returns.

import type { Organization, WebSite } from "schema-dts";

import { SUPPORT_EMAIL } from "@/lib/contact";
import { RETURN_POLICY, SHIPPING_SERVICE } from "./policies";
import { SITE_NAME, SITE_ORIGIN } from "./site";

const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;

// TODO: logo, once it's final.
export function buildOrganizationJsonLd(): Organization {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    email: SUPPORT_EMAIL,
    contactPoint: { "@type": "ContactPoint", contactType: "customer service", email: SUPPORT_EMAIL },
    hasShippingService: SHIPPING_SERVICE,
    hasMerchantReturnPolicy: RETURN_POLICY,
  };
}

// alternateName gives Google fallbacks if "Cannan" alone isn't treated as
// unique.
function buildWebSiteJsonLd(): WebSite {
  return {
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: ["Shop Cannan", "shopcannan.com"],
    url: `${SITE_ORIGIN}/`,
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function buildHomeJsonLd() {
  return {
    "@context": "https://schema.org" as const,
    "@graph": [buildWebSiteJsonLd(), buildOrganizationJsonLd()],
  };
}
