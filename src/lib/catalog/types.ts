// lib/catalog/types.ts
//
// Types only, like lib/cart/types.ts: safe to import from client components.

export type CategoryView = {
  slug: string;
  name: string;
};

// A collection card on the homepage.
export type CollectionView = {
  slug: string;
  name: string;
  description: string;
};

// A product card on the listing page and the homepage.
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
  name: string | null; // option name, e.g. "Size"; null on a default variant
  value: string | null; // e.g. "Large"
  priceCents: number;
  stock: number; // a hint for the UI; addToCart and the webhook re-check it
};

export type ProductDetailView = {
  slug: string;
  name: string;
  description: string;
  images: ProductImageView[]; // by position
  variants: ProductVariantView[]; // active only, by position
};
