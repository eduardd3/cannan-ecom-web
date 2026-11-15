// lib/feed/xml.ts
//
// Step 4. Pure: FeedItem[] in, an RSS 2.0 document out, in the shape of
// Google's RSS example: an <rss version="2.0"> root declaring
// xmlns:g="http://base.google.com/ns/1.0", one <channel> with title, link and
// description, then one <item> per FeedItem with every attribute as a g: tag.
// No library: the project avoids new dependencies, and escaping is small.

import { absoluteUrl, SITE_NAME } from "@/lib/seo/site";
import type { FeedItem } from "./types";

// Every control character XML 1.0 forbids. Tab, LF and CR (U+0009, U+000A,
// U+000D) are allowed, which is why the ranges skip them.
const FORBIDDEN_CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

/**
 * Text that's safe inside an XML element: & < > (and " ' for attributes)
 * replaced by their entities, and characters XML forbids removed.
 *
 * - & is replaced first, or the & of the entities written after it would be
 *   escaped again.
 * - Forbidden control characters are removed rather than escaped: one pasted
 *   into a description makes the WHOLE file unreadable to Google.
 * - Accented letters (Arcángel, Ochún) stay as they are: the file is UTF-8.
 */
export function escapeXml(text: string): string {
  return text
    .replace(FORBIDDEN_CONTROL_CHARS, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** One g: tag, or "" for an undefined value so the tag is left out. */
function tag(name: string, value: string | undefined): string {
  return value === undefined ? "" : `<g:${name}>${escapeXml(value)}</g:${name}>`;
}

/**
 * One <item>. Tag names are written out rather than derived from the field
 * names, so each one can be searched for and matched to Google's spec.
 */
function renderItem(item: FeedItem): string {
  const tags = [
    tag("id", item.id),
    tag("item_group_id", item.itemGroupId),
    tag("title", item.title),
    tag("description", item.description),
    tag("link", item.link),
    tag("image_link", item.imageLink),
    ...item.additionalImageLinks.map((url) => tag("additional_image_link", url)),
    tag("availability", item.availability),
    tag("price", item.price),
    tag("condition", item.condition),
    tag("brand", item.brand),
    tag("gtin", item.gtin),
    tag("mpn", item.mpn),
    tag("identifier_exists", item.identifierExists),
    tag("size", item.size),
    tag("color", item.color),
    tag("product_type", item.productType),
    tag("google_product_category", item.googleProductCategory),
    tag("return_policy_label", item.returnPolicyLabel),
  ].filter((line) => line !== "");

  return ["<item>", ...tags.map((line) => `  ${line}`), "</item>"].map((line) => `    ${line}`).join("\n");
}

/** The whole feed file. */
export function renderFeedXml(items: FeedItem[]): string {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`,
    `  <channel>`,
    `    <title>${escapeXml(SITE_NAME)}</title>`,
    `    <link>${escapeXml(absoluteUrl("/"))}</link>`,
    `    <description>${escapeXml(`${SITE_NAME} product feed`)}</description>`,
    ...items.map(renderItem),
    `  </channel>`,
    `</rss>`,
    "",
  ].join("\n");
}
