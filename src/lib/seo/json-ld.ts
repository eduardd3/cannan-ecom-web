// lib/seo/json-ld.ts
//
// The one way structured data is serialized for a <script> tag. Pure, so the
// builders that use it are unit-tested without React.

/**
 * JSON for a <script type="application/ld+json"> body. Every "<" becomes
 * <: JSON.stringify alone leaves a value containing "</script>" free to
 * close the tag and inject markup. JSON parsers read < back as "<".
 */
export function toJsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
