// app/feeds/google.xml/route.ts
//
// The Merchant Center product feed. Merchant Center fetches this URL on a
// schedule and treats the file as the whole catalog: an item missing from it
// is removed. The file name has to end in .xml, hence the folder name.
//
// Not behind the proxy's auth: authorized() in auth.config.ts returns true
// for paths it doesn't list, and the matcher in src/proxy.ts lets /feeds
// through. Check that still holds if either changes.

import { toFeedItems } from "@/lib/feed/items";
import { getFeedProducts } from "@/lib/feed/queries";
import { renderFeedXml } from "@/lib/feed/xml";
import { isCatalogEnabled } from "@/lib/flags";

//  Rendered per request, like the sitemap: a build-time feed would freeze the
//  catalog until the next deploy, and the build would need the database.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  //  Catalog off → a plain 404. Merchant Center reports a failed fetch (which
  //  you'll see) and keeps the items from its last successful one, instead of
  //  an empty file that would remove every listing.
  if (!isCatalogEnabled()) {
    return new Response("Not found", { status: 404 });
  }
  const products = await getFeedProducts();
  const items = toFeedItems(products);
  const xml = renderFeedXml(items);

  return new Response (xml, { headers: { "Content-Type": "application/xml; charset=utf-8"}, });
}
