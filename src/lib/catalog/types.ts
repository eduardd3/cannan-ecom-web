// lib/catalog/types.ts
//
// Types only, like lib/cart/types.ts: safe to import from client components.

// A link in the collection page's switcher.
export type SwitcherCollectionView = {
  slug: string;
  name: string;
};

// A collection card on the homepage.
export type CollectionView = {
  slug: string;
  name: string;
  description: string;
};

// A product card on the collection page and the homepage.
export type ProductCardView = {
  slug: string;
  name: string;
  imageUrl: string | null;
  imageAlt: string | null;
  minPriceCents: number; // across active variants
  hasPriceRange: boolean; // variants differ in price → show "From $X"
  inStock: boolean; // any active variant has stock > 0
};

export type ProductImageView = {
  url: string;
  alt: string;
  variantId: number | null; // null = applies to every variant
};

export type ProductVariantView = {
  id: number;
  option1Value: string | null; // e.g. "Roja"; null on a default variant
  option2Value: string | null; // e.g. "12 in"; only alongside option1Value
  priceCents: number;
  stock: number; // a hint for the UI; addToCart and the webhook re-check it
};

export type ProductDetailView = {
  slug: string;
  name: string;
  description: string;
  option1Name: string | null; // e.g. "Color"; null = one default variant
  option2Name: string | null; // e.g. "Size"
  images: ProductImageView[]; // by position
  variants: ProductVariantView[]; // active only, by position
};
