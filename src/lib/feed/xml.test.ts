import { describe, expect, it } from "vitest";

import type { FeedItem } from "./types";
import { escapeXml, renderFeedXml } from "./xml";

describe("escapeXml", () => {
  it("escapes & < > \" '", () => {
    expect(escapeXml(`a & b < c > d " e ' f`)).toBe("a &amp; b &lt; c &gt; d &quot; e &apos; f");
  });

  it("doesn't double-escape: '&amp;' in, '&amp;amp;' out (escape & first)", () => {
    expect(escapeXml("&amp;")).toBe("&amp;amp;");
    expect(escapeXml("<")).toBe("&lt;");
  });

  it("keeps accented letters: 'San Rafael Arcángel' is unchanged", () => {
    expect(escapeXml("San Rafael Arcángel")).toBe("San Rafael Arcángel");
    expect(escapeXml("Ochún 🙏")).toBe("Ochún 🙏");
  });

  it("removes control characters XML forbids (e.g. \\u0007)", () => {
    expect(escapeXml("bell\u0007 null\u0000 esc\u001B")).toBe("bell null esc");
  });

  it("keeps tab, newline and carriage return", () => {
    expect(escapeXml("a\tb\nc\rd")).toBe("a\tb\nc\rd");
  });
});

function item(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id: "101",
    title: "San José Statue",
    description: "San José holding the Child.",
    link: "https://www.shopcannan.com/products/san-jose-statue",
    imageLink: "https://www.shopcannan.com/seed-images/products/a/1.jpg",
    additionalImageLinks: [],
    availability: "in_stock",
    price: "24.00 USD",
    condition: "new",
    productType: "Statues > San José",
    ...overrides,
  };
}

describe("renderFeedXml", () => {
  it("starts with the XML declaration and declares the g namespace on <rss>", () => {
    const xml = renderFeedXml([]);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
    expect(xml).toContain('<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">');
    expect(xml).toContain("<link>https://www.shopcannan.com/</link>");
    expect(xml.trimEnd().endsWith("</rss>")).toBe(true);
  });

  it("writes one <item> per FeedItem", () => {
    const xml = renderFeedXml([item({ id: "1" }), item({ id: "2" }), item({ id: "3" })]);
    expect(xml.match(/<item>/g)).toHaveLength(3);
    expect(xml.match(/<\/item>/g)).toHaveLength(3);
    expect(xml.indexOf("<g:id>1</g:id>")).toBeLessThan(xml.indexOf("<g:id>2</g:id>"));
  });

  it("leaves out tags for undefined fields", () => {
    const xml = renderFeedXml([item()]);
    for (const name of ["item_group_id", "brand", "gtin", "mpn", "identifier_exists", "size", "color"]) {
      expect(xml).not.toContain(`<g:${name}>`);
    }
    expect(xml).not.toContain("<g:additional_image_link>");
  });

  it("repeats g:additional_image_link once per URL", () => {
    const xml = renderFeedXml([item({ additionalImageLinks: ["https://x.test/2.jpg", "https://x.test/3.jpg"] })]);
    expect(xml.match(/<g:additional_image_link>/g)).toHaveLength(2);
    expect(xml).toContain("<g:additional_image_link>https://x.test/3.jpg</g:additional_image_link>");
  });

  it("escapes values, including the & in a URL", () => {
    const xml = renderFeedXml([
      item({ title: "Candles <3 & more", link: "https://www.shopcannan.com/products/x?variant=1&ref=feed" }),
    ]);
    expect(xml).toContain("<g:title>Candles &lt;3 &amp; more</g:title>");
    expect(xml).toContain("<g:link>https://www.shopcannan.com/products/x?variant=1&amp;ref=feed</g:link>");
  });

  it("writes snake_case tags: g:item_group_id, g:image_link, g:return_policy_label", () => {
    const xml = renderFeedXml([item({ itemGroupId: "7", returnPolicyLabel: "final-sale", identifierExists: "no" })]);
    expect(xml).toContain("<g:item_group_id>7</g:item_group_id>");
    expect(xml).toContain("<g:image_link>");
    expect(xml).toContain("<g:return_policy_label>final-sale</g:return_policy_label>");
    expect(xml).toContain("<g:identifier_exists>no</g:identifier_exists>");
  });
});
