import { describe, expect, it } from "vitest";

import { buildOpenGraph } from "./open-graph";
import { toJsonLdScript } from "./json-ld";
import { buildHomeJsonLd, buildOrganizationJsonLd } from "./organization";
import { absoluteUrl } from "./site";

describe("toJsonLdScript", () => {
  it("leaves no literal < that could close the script tag", () => {
    const out = toJsonLdScript({ description: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).description).toBe("</script><script>alert(1)</script>");
  });
});

describe("absoluteUrl", () => {
  it("puts paths on the www origin and leaves absolute URLs alone", () => {
    expect(absoluteUrl("/products/x")).toBe("https://www.shopcannan.com/products/x");
    expect(absoluteUrl("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
  });

  it("refuses a relative path", () => {
    expect(() => absoluteUrl("products/x")).toThrow();
  });
});

describe("buildOpenGraph", () => {
  it("always sets the site-wide fields", () => {
    expect(buildOpenGraph({ title: "Signature", path: "/collections/signature" })).toEqual({
      type: "website",
      siteName: "Cannan",
      locale: "en_US",
      url: "/collections/signature",
      title: "Signature",
    });
  });

  it("refuses a URL with parameters", () => {
    expect(() => buildOpenGraph({ title: "x", path: "/products/x?variant=1" })).toThrow();
  });
});

describe("buildOrganizationJsonLd", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = JSON.parse(JSON.stringify(buildOrganizationJsonLd())) as Record<string, any>;

  it("ships free to the US, 0–1 handling and 3–5 transit business days", () => {
    const service = org.hasShippingService;
    expect(service.handlingTime.duration).toMatchObject({ minValue: 0, maxValue: 1, unitCode: "DAY" });
    expect(service.handlingTime.businessDays).toHaveLength(5);
    expect(service.shippingConditions).toHaveLength(1);
    const [conditions] = service.shippingConditions;
    expect(conditions.shippingDestination).toEqual({ "@type": "DefinedRegion", addressCountry: "US" });
    expect(conditions.shippingRate).toEqual({ "@type": "MonetaryAmount", value: 0, currency: "USD" });
    expect(conditions.transitTime.duration).toMatchObject({ minValue: 3, maxValue: 5, unitCode: "DAY" });
    expect(conditions.transitTime.businessDays).not.toContain("https://schema.org/Saturday");
  });

  it("returns within 30 days by mail; remorse fees on the customer, defects free", () => {
    expect(org.hasMerchantReturnPolicy).toMatchObject({
      applicableCountry: ["US"],
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 30,
      returnMethod: "https://schema.org/ReturnByMail",
      customerRemorseReturnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
      itemDefectReturnFees: "https://schema.org/FreeReturn",
      itemDefectReturnLabelSource: "https://schema.org/ReturnLabelDownloadAndPrint",
      refundType: "https://schema.org/FullRefund",
    });
  });

  it("has no logo yet, and the WebSite points at it", () => {
    expect(org).not.toHaveProperty("logo");
    const [website] = buildHomeJsonLd()["@graph"];
    expect(website).toMatchObject({ "@type": "WebSite", publisher: { "@id": org["@id"] } });
  });
});
