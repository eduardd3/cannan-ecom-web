// lib/feed/categories.ts
//
// Google product category per ProductType slug (the slugs come from the
// catalog_model migration). The most specific category that fits wins over
// the general religious one, which is why nativity sets, prints, candles and
// Bibles each have their own.
//
// Every id checked against Google's own taxonomy-with-ids.en-US.txt (taxonomy
// version 2021-09-21) on 2026-11-15. A new ProductType needs an entry here;
// without one the item ships without google_product_category and Google
// guesses. Statues and crucifixes use Religious Items rather than
// Home & Garden > Decor > Artwork > Sculptures & Statues (11): they're sold as
// devotional goods, not decor.

export const GOOGLE_PRODUCT_CATEGORY: Record<string, string> = {
  statues: "97", // Religious & Ceremonial > Religious Items
  crucifixes: "97", // Religious & Ceremonial > Religious Items
  "nativity-sets": "6531", // Home & Garden > Decor > Seasonal & Holiday Decorations > Nativity Sets
  "framed-prints": "500044", // Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork
  candles: "588", // Home & Garden > Decor > Home Fragrances > Candles
  bibles: "543543", // Media > Books > Print Books
};
