import { describe, expect, it } from "vitest";

import { MAX_TRACKING_LENGTH, normalizeTrackingNumber, parseCarrier, trackingUrl } from "./shipping";

describe("normalizeTrackingNumber", () => {
  it("drops spaces and uppercases", () => {
    expect(normalizeTrackingNumber(" 9400 1000 0000 0000 0000 00 ")).toBe("9400100000000000000000");
    expect(normalizeTrackingNumber("1z999aa10123456784")).toBe("1Z999AA10123456784");
  });

  it("keeps hyphens", () => {
    expect(normalizeTrackingNumber("LX-12345-US")).toBe("LX-12345-US");
  });

  it("refuses blanks, too-short, too-long, and odd characters", () => {
    expect(normalizeTrackingNumber("   ")).toBeNull();
    expect(normalizeTrackingNumber("1234")).toBeNull();
    expect(normalizeTrackingNumber("1".repeat(MAX_TRACKING_LENGTH + 1))).toBeNull();
    expect(normalizeTrackingNumber("1Z999/AA10")).toBeNull();
    expect(normalizeTrackingNumber("<script>")).toBeNull();
  });
});

describe("parseCarrier", () => {
  it("accepts the fixed list only", () => {
    expect(parseCarrier("FEDEX")).toBe("FEDEX");
    expect(parseCarrier("fedex")).toBeNull();
    expect(parseCarrier("DHL")).toBeNull();
    expect(parseCarrier(null)).toBeNull();
  });
});

describe("trackingUrl", () => {
  it("builds each carrier's tracking page", () => {
    expect(trackingUrl("USPS", "9400100000000000000000")).toBe(
      "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400100000000000000000",
    );
    expect(trackingUrl("UPS", "1Z999AA10123456784")).toBe("https://www.ups.com/track?tracknum=1Z999AA10123456784");
    expect(trackingUrl("FEDEX", "123456789012")).toBe("https://www.fedex.com/fedextrack/?trknbr=123456789012");
  });

  it("has no link for OTHER", () => {
    expect(trackingUrl("OTHER", "LX-12345-US")).toBeNull();
  });
});
