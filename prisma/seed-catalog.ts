//  Dev catalog for prisma/seed.ts. Dev database only: production products
//  and stock come in through the admin, not the seed.
//
//  Image keys resolve through getImageUrl (src/lib/storage), which treats
//  any key starting with "products/" as a seed image, so each key needs a
//  file at public/seed-images/<key>. Keep photos small (~300 KB):
//  they're committed.
//
//  Stock is the OPENING count, written once as an INITIAL_STOCK adjustment.
//  Changing it here after a variant has been seeded does nothing; adjust
//  stock in the admin (or reset the dev database) instead.

export type SeedCategory = {
    slug: string;
    name: string;
    description?: string;
};

export type SeedVariant = {
    sku: string;
    //  name/value both null = the product's single default variant (no picker)
    name: string | null;
    value: string | null;
    priceCents: number;
    initialStock: number;
    amazonAsin?: string;
    images?: SeedImage[]; //  shown only while this variant is selected
};

export type SeedImage = {
    key: string; //  e.g. "products/<product-slug>/1.jpg"
    alt: string;
};

export type SeedProduct = {
    slug: string;
    collection: string; //  Collection slug; the collections come from a migration
    featured?: boolean; //  shown first in the homepage's featured pieces
    name: string;
    description: string;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    categories: string[]; //  SeedCategory slugs
    images: SeedImage[]; //  shared by every variant
    variants: SeedVariant[];
};

export const SEED_CATEGORIES: SeedCategory[] = [
    { slug: "caridad-del-cobre", name: "Caridad del Cobre" },
    { slug: "rosa-de-lima", name: "Rosa de Lima" },
    { slug: "nuestra-senora-del-pilar", name: "Nuestra Señora del Pilar" },
    { slug: "san-jose", name: "San José" },
];

//  Descriptions render with whitespace-pre-line: blank lines are paragraphs.
export const SEED_PRODUCTS: SeedProduct[] = [
    {
        slug: "virgen-caridad-del-cobre",
        collection: "signature",
        featured: true,
        name: "Virgen Caridad del Cobre",
        description: [
            "Home décor, devout gift, prayerful inspiration.",
            "Patrona de Cuba.",
            "Feast day: September 8.",
        ].join("\n\n"),
        status: "ACTIVE",
        categories: ["caridad-del-cobre"],
        images: [
            { key: "products/virgen-caridad-del-cobre/1.jpg", alt: "Virgen de la Caridad del Cobre statue, front view" },
            { key: "products/virgen-caridad-del-cobre/2.jpg", alt: "Virgen de la Caridad del Cobre statue, back view" },
        ],
        variants: [
            { sku: "CN-CAR-06", name: null, value: null, priceCents: 2499, initialStock: 6, amazonAsin: "B0C86TXYT5" },
        ],
    },
    {
        slug: "saint-rosa-of-lima",
        collection: "signature",
        featured: true,
        name: "Saint Rosa of Lima",
        description: [
            "DIMENSIONS: This religious statue measures 12 inches in height, 4 inches in width, and 3.5 inches in depth, perfect for tabletop display.",
            "DETAILED DESIGN: Beautifully crafted resin figure featuring traditional religious attire adorned with intricate golden decorative patterns.",
            "VERSATILE DISPLAY: Ideal for home altars, prayer corners, or as a meaningful decorative piece with its ornate golden base.",
            "DURABLE MATERIAL: Constructed from high-quality resin material that captures fine details while ensuring longevity.",
            "ARTISTIC FEATURES: Showcases delicate floral elements and carefully painted details in a harmonious multicolor palette.",
        ].join("\n\n"),
        status: "ACTIVE",
        categories: ["rosa-de-lima"],
        images: [
            { key: "products/saint-rosa-of-lima/1.jpg", alt: "Saint Rosa of Lima statue, front view" },
            { key: "products/saint-rosa-of-lima/2.jpg", alt: "Saint Rosa of Lima statue, back view" },
        ],
        variants: [
            { sku: "CN-RSL-12", name: null, value: null, priceCents: 4999, initialStock: 6, amazonAsin: "B0FMWFVDPZ" },
        ],
    },
    {
        slug: "nuestra-senora-del-pilar",
        collection: "signature",
        name: "Nuestra Señora del Pilar",
        description: [
            "AUTHENTIC DESIGN: Beautifully detailed religious sculpture featuring traditional iconography with ornate golden sunburst halo and decorative base.",
            "DIMENSIONS: Measures 12 inches in height, 3 inches in width, and 2.5 inches in depth, perfect for tabletop display.",
            "CRAFTSMANSHIP: Intricately crafted from durable resin with delicate hand-painted details in blue, red, white, and gold tones.",
            "VERSATILE DISPLAY: Ideal for home altars, religious spaces, or as a meaningful decorative piece with its elegant multicolor finish.",
            "DETAILED FEATURES: Adorned with elaborate golden floral patterns on the white base and decorative fringe trim for enhanced visual appeal.",
        ].join("\n\n"),
        status: "ACTIVE",
        categories: ["nuestra-senora-del-pilar"],
        images: [
            { key: "products/nuestra-senora-del-pilar/1.jpg", alt: "Nuestra Señora del Pilar statue, front view" },
            { key: "products/nuestra-senora-del-pilar/2.jpg", alt: "Nuestra Señora del Pilar statue, back view" },
        ],
        variants: [
            { sku: "CN-PLR-12", name: null, value: null, priceCents: 4900, initialStock: 6, amazonAsin: "B0FPHW1T85" },
        ],
    },
    {
        slug: "san-jose-dormido",
        collection: "signature",
        name: "San José Dormido",
        description: [
            "San José dormiente recuerda que, a pesar de las dificultades y responsabilidades, la fe en Dios y su providencia puede permitir descansar en la confianza.",
            "Representación de San José en un estado de sueño o reposo, asociada con la visión que tuvo en sueños de un ángel que le revelaba detalles sobre el nacimiento de Jesús.",
            "DURABLE MATERIAL: Constructed from high-quality resin material that captures fine details while providing long-lasting durability.",
            "DECORATIVE PIECE: Perfect size for altars, shelves, or display cases, featuring fine craftsmanship in every detail from the clothing to facial features.",
        ].join("\n\n"),
        status: "ACTIVE",
        categories: ["san-jose"],
        images: [
            { key: "products/san-jose-dormido/1.jpg", alt: "San José Dormido statue, front view" },
            { key: "products/san-jose-dormido/2.jpg", alt: "San José Dormido statue, back view" },
        ],
        variants: [
            { sku: "CN-JSD-05", name: null, value: null, priceCents: 1699, initialStock: 6, amazonAsin: "B0F6Y616LF" },
        ],
    },
    //  Orishas and Santa Muerte: no photos yet, so their cards show the
    //  placeholder background.
    {
        slug: "yemaya-statue",
        collection: "orisha",
        featured: true,
        name: "Yemayá Statue",
        description: [
            "Yemayá, mother of the sea, shown in her traditional blue and white.",
            "Resin, 8 inches tall. Paint and finish vary slightly from piece to piece.",
        ].join("\n\n"),
        status: "ACTIVE",
        categories: [],
        images: [],
        variants: [
            { sku: "CN-YMY-08", name: null, value: null, priceCents: 3499, initialStock: 5 },
        ],
    },
    {
        slug: "chango-statue",
        collection: "orisha",
        name: "Changó Statue",
        description: [
            "Changó, Orisha of thunder and fire, in red and white.",
            "Resin, 8 inches tall. Paint and finish vary slightly from piece to piece.",
        ].join("\n\n"),
        status: "ACTIVE",
        categories: [],
        images: [],
        variants: [
            { sku: "CN-CHG-08", name: null, value: null, priceCents: 3499, initialStock: 4 },
        ],
    },
    {
        slug: "oshun-statue",
        collection: "orisha",
        name: "Oshún Statue",
        description: [
            "Oshún, Orisha of rivers and love, in gold and amber tones.",
            "Resin, 8 inches tall. Paint and finish vary slightly from piece to piece.",
        ].join("\n\n"),
        status: "ACTIVE",
        categories: [],
        images: [],
        variants: [
            { sku: "CN-OSH-08", name: null, value: null, priceCents: 3499, initialStock: 0 },
        ],
    },
    {
        slug: "santa-muerte-statue-white",
        collection: "santa-muerte",
        featured: true,
        name: "Santa Muerte Statue, White",
        description: [
            "La Santa Muerte in white robes, holding her scythe and globe.",
            "Resin, 12 inches tall. Paint and finish vary slightly from piece to piece.",
        ].join("\n\n"),
        status: "ACTIVE",
        categories: [],
        images: [],
        variants: [
            { sku: "CN-SMW-12", name: null, value: null, priceCents: 4499, initialStock: 6 },
        ],
    },
    {
        slug: "santa-muerte-seven-day-candle",
        collection: "santa-muerte",
        featured: true,
        name: "Santa Muerte Seven-Day Candle",
        description: [
            "A seven-day glass candle with a printed image of La Santa Muerte.",
            "About 8 inches tall.",
        ].join("\n\n"),
        status: "ACTIVE",
        categories: [],
        images: [],
        variants: [
            { sku: "CN-SMC-WHT", name: "Color", value: "White", priceCents: 1299, initialStock: 12 },
            { sku: "CN-SMC-GLD", name: "Color", value: "Gold", priceCents: 1499, initialStock: 8 },
        ],
    },
    {
        slug: "santa-muerte-prayer-card",
        collection: "santa-muerte",
        name: "Santa Muerte Prayer Card",
        description: "A laminated prayer card with an image of La Santa Muerte on the front and a prayer in Spanish on the back.",
        status: "ACTIVE",
        categories: [],
        images: [],
        variants: [
            { sku: "CN-SMP-01", name: null, value: null, priceCents: 399, initialStock: 25 },
        ],
    },
];
