import type { Thing, WithContext } from "schema-dts";

import { toJsonLdScript } from "@/lib/seo/json-ld";

type JsonLdData = WithContext<Thing> | { "@context": "https://schema.org"; "@graph": Thing[] };

//  A plain <script>, rendered by the page's Server Component: Google and
//  Merchant Center read the markup from the HTML the server returns, so it
//  never goes through next/script or client-side code.
export default function JsonLd({ data }: { data: JsonLdData }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLdScript(data) }} />;
}
