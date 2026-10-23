//  Dev catalog for prisma/seed.ts. Dev database only: production products
//  and stock come in through the admin, not the seed.
//
//  Image keys resolve through getImageUrl (src/lib/storage), which treats
//  any key starting with "products/" as a seed image, so each key needs a
//  file at public/seed-images/<key>. Keep photos small (~300 KB):
//  they're committed. Only four products have photos so far; the rest reuse
//  them as placeholders, and their alt text says so.
//
//  Stock is the OPENING count, written once as an INITIAL_STOCK adjustment.
//  Changing it here after a variant has been seeded does nothing; adjust
//  stock in the admin (or reset the dev database) instead.
//
//  Collections and product types come from migrations; reference them by slug.

export type SeedCategory = {
    slug: string;
    name: string;
    collection: string; //  Collection slug
    description?: string;
};

export type SeedVariant = {
    sku: string;
    //  Values for the product's option names, set exactly when the name is.
    option1Value?: string;
    option2Value?: string;
    priceCents: number;
    initialStock: number;
    dimensions?: [height: number, width: number, depth: number]; //  inches
    amazonAsin?: string;
    images?: SeedImage[]; //  shown only while this variant is selected
};

export type SeedImage = {
    key: string; //  e.g. "products/<product-slug>/1.jpg"
    alt: string;
};

export type SeedProduct = {
    slug: string;
    collection: string; //  Collection slug
    type: string; //  ProductType slug
    category?: string; //  SeedCategory slug, in the same collection
    featured?: boolean; //  shown first in the homepage's featured pieces
    name: string;
    description: string;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    option1Name?: string; //  none = one default variant
    option2Name?: string; //  needs option1Name
    material?: string;
    isFinalSale?: boolean;
    images: SeedImage[]; //  shared by every variant
    variants: SeedVariant[];
};

const STOCK = 5;
const STATUE = "Resin, painted finish";

//  The committed photos, reused as placeholders across the catalog.
const PHOTO = {
    cobre1: "products/virgen-caridad-del-cobre/1.jpg",
    cobre2: "products/virgen-caridad-del-cobre/2.jpg",
    rosa1: "products/saint-rosa-of-lima/1.jpg",
    rosa2: "products/saint-rosa-of-lima/2.jpg",
    pilar1: "products/nuestra-senora-del-pilar/1.jpg",
    pilar2: "products/nuestra-senora-del-pilar/2.jpg",
    jose1: "products/san-jose-dormido/1.jpg",
    jose2: "products/san-jose-dormido/2.jpg",
};

function placeholders(name: string, ...keys: string[]): SeedImage[] {
    return keys.map((key) => ({ key, alt: `Placeholder photo for ${name}` }));
}

//  A statue's dimensions when only its height is known: roughly the
//  proportions of the listed ones, to the nearest half inch.
function statue(height: number): [number, number, number] {
    const half = (n: number) => Math.round(n * 2) / 2;
    return [height, half(height * 0.42), half(height * 0.35)];
}

export const SEED_CATEGORIES: SeedCategory[] = [
    //  Signature: Devotion
    { slug: "caridad-del-cobre", name: "Caridad del Cobre", collection: "signature" },
    { slug: "nuestra-senora-de-guadalupe", name: "Nuestra Señora de Guadalupe", collection: "signature" },
    { slug: "san-jose", name: "San José", collection: "signature" },
    { slug: "san-judas-tadeo", name: "San Judas Tadeo", collection: "signature" },
    { slug: "virgen-la-milagrosa", name: "Virgen la Milagrosa", collection: "signature" },
    //  Orishas: Orisha
    { slug: "elegua", name: "Elegguá", collection: "orishas" },
    { slug: "obatala", name: "Obatalá", collection: "orishas" },
    { slug: "oshun", name: "Oshún", collection: "orishas" },
    { slug: "yemaya", name: "Yemayá", collection: "orishas" },
    { slug: "chango", name: "Changó", collection: "orishas" },
    { slug: "ogun", name: "Ogún", collection: "orishas" },
    { slug: "babalu-aye", name: "Babalú-Ayé", collection: "orishas" },
    //  Santa Muerte: none (its facet is the Color option)
];

//  Descriptions render with whitespace-pre-line: blank lines are paragraphs.
//  1–2 sentences about what the piece depicts; material and size go in Details.
export const SEED_PRODUCTS: SeedProduct[] = [
    //  ---------------------------------------------------------------- Signature
    {
        slug: "nuestra-senora-de-guadalupe-statue",
        collection: "signature",
        type: "statues",
        category: "nuestra-senora-de-guadalupe",
        featured: true,
        name: "Nuestra Señora de Guadalupe Statue",
        description: "La Virgen de Guadalupe in her starred mantle, standing on the crescent moon held by an angel.",
        status: "ACTIVE",
        material: STATUE,
        images: placeholders("Nuestra Señora de Guadalupe Statue", PHOTO.pilar1),
        variants: [{ sku: "SIG-GUA-STA", priceCents: 4900, initialStock: STOCK }],
    },
    {
        slug: "san-jose-statue",
        collection: "signature",
        type: "statues",
        category: "san-jose",
        featured: true,
        name: "San José Statue",
        description: "San José holding the Child Jesus, with the lily that stands for his purity.",
        status: "ACTIVE",
        option1Name: "Size",
        material: STATUE,
        images: placeholders("San José Statue", PHOTO.jose1, PHOTO.jose2, PHOTO.rosa1, PHOTO.cobre1),
        variants: [
            { sku: "SIG-SJS-08", option1Value: "8 in", priceCents: 2400, initialStock: STOCK, dimensions: [8, 3.5, 3] },
            { sku: "SIG-SJS-12", option1Value: "12 in", priceCents: 3800, initialStock: STOCK, dimensions: [12, 5, 4] },
            { sku: "SIG-SJS-18", option1Value: "18 in", priceCents: 6400, initialStock: 0, dimensions: [18, 7.5, 6] },
        ],
    },
    {
        slug: "san-judas-tadeo-statue",
        collection: "signature",
        type: "statues",
        category: "san-judas-tadeo",
        name: "San Judas Tadeo Statue",
        description: "San Judas Tadeo in green and white, with the image of Christ on his chest and the flame above his head.",
        status: "ACTIVE",
        option1Name: "Size",
        material: STATUE,
        images: placeholders("San Judas Tadeo Statue", PHOTO.rosa2),
        variants: [
            { sku: "SIG-SJT-08", option1Value: "8 in", priceCents: 3800, initialStock: STOCK, dimensions: statue(8) },
            { sku: "SIG-SJT-12", option1Value: "12 in", priceCents: 5200, initialStock: STOCK, dimensions: statue(12) },
        ],
    },
    {
        slug: "nativity-set",
        collection: "signature",
        type: "nativity-sets",
        name: "Nativity Set",
        description: "The Holy Family in the manger, with the shepherds and the three kings.",
        status: "ACTIVE",
        material: STATUE,
        images: placeholders("Nativity Set", PHOTO.pilar2),
        variants: [{ sku: "SIG-NAT-SET", priceCents: 8900, initialStock: STOCK }],
    },
    {
        slug: "caridad-del-cobre-prayer-candle",
        collection: "signature",
        type: "candles",
        category: "caridad-del-cobre",
        name: "Caridad del Cobre Prayer Candle",
        description: "A prayer candle bearing la Virgen de la Caridad del Cobre over the three fishermen at sea.",
        status: "ACTIVE",
        material: "Wax",
        images: placeholders("Caridad del Cobre Prayer Candle", PHOTO.cobre1),
        variants: [{ sku: "SIG-CAR-CDL", priceCents: 1400, initialStock: STOCK }],
    },
    {
        slug: "san-jose-framed-print",
        collection: "signature",
        type: "framed-prints",
        category: "san-jose",
        name: "San José Framed Print",
        description: "San José and the Child Jesus in the carpenter's workshop.",
        status: "ACTIVE",
        material: "Wood frame, printed image",
        images: placeholders("San José Framed Print", PHOTO.jose2),
        variants: [{ sku: "SIG-SJS-PRT", priceCents: 3600, initialStock: STOCK }],
    },
    {
        slug: "wall-crucifix",
        collection: "signature",
        type: "crucifixes",
        name: "Wall Crucifix",
        description: "Christ on the cross, made to hang above a doorway or a bed.",
        status: "ACTIVE",
        material: STATUE,
        images: placeholders("Wall Crucifix", PHOTO.rosa1),
        variants: [{ sku: "SIG-CRU-WAL", priceCents: 4200, initialStock: STOCK }],
    },
    {
        slug: "holy-bible-catholic-edition",
        collection: "signature",
        type: "bibles",
        name: "Holy Bible, Catholic Edition",
        description: "The complete Catholic Bible, with the deuterocanonical books.",
        status: "ACTIVE",
        images: placeholders("Holy Bible, Catholic Edition", PHOTO.pilar1),
        variants: [{ sku: "SIG-BIB-CAT", priceCents: 2900, initialStock: STOCK }],
    },
    {
        slug: "virgen-la-milagrosa-statue",
        collection: "signature",
        type: "statues",
        category: "virgen-la-milagrosa",
        name: "Virgen la Milagrosa Statue",
        description: "La Virgen Milagrosa with her arms open and rays of grace falling from her hands.",
        status: "ACTIVE",
        material: STATUE,
        images: placeholders("Virgen la Milagrosa Statue", PHOTO.cobre2),
        variants: [{ sku: "SIG-MIL-STA", priceCents: 3200, initialStock: 0 }],
    },
    {
        slug: "advent-candle-set",
        collection: "signature",
        type: "candles",
        name: "Advent Candle Set",
        description: "Three violet candles and one rose, for the four Sundays of Advent.",
        status: "ACTIVE",
        material: "Wax",
        isFinalSale: true,
        images: placeholders("Advent Candle Set", PHOTO.jose1),
        variants: [{ sku: "SIG-ADV-SET", priceCents: 3200, initialStock: STOCK }],
    },

    //  ------------------------------------------------------------------ Orishas
    {
        slug: "oshun-statue",
        collection: "orishas",
        type: "statues",
        category: "oshun",
        featured: true,
        name: "Oshún Statue",
        description: "Oshún in gold, holding her mirror beside the river.",
        status: "ACTIVE",
        option1Name: "Size",
        material: STATUE,
        images: placeholders("Oshún Statue", PHOTO.cobre1),
        variants: [
            { sku: "ORI-OSH-08", option1Value: "8 in", priceCents: 4200, initialStock: STOCK, dimensions: statue(8) },
            { sku: "ORI-OSH-12", option1Value: "12 in", priceCents: 5800, initialStock: STOCK, dimensions: statue(12) },
        ],
    },
    {
        slug: "oshun-peacock-statue",
        collection: "orishas",
        type: "statues",
        category: "oshun",
        name: "Oshún Peacock Statue",
        description: "Oshún seated with her peacock, its tail spread behind her.",
        status: "ACTIVE",
        option1Name: "Size",
        material: STATUE,
        images: placeholders("Oshún Peacock Statue", PHOTO.cobre2),
        variants: [
            { sku: "ORI-OSP-10", option1Value: "10 in", priceCents: 5800, initialStock: STOCK, dimensions: statue(10) },
            { sku: "ORI-OSP-14", option1Value: "14 in", priceCents: 7600, initialStock: STOCK, dimensions: statue(14) },
        ],
    },
    {
        slug: "yemaya-statue",
        collection: "orishas",
        type: "statues",
        category: "yemaya",
        name: "Yemayá Statue",
        description: "Yemayá in blue and white, rising from the waves of the sea.",
        status: "ACTIVE",
        option1Name: "Size",
        material: STATUE,
        images: placeholders("Yemayá Statue", PHOTO.pilar1),
        variants: [
            { sku: "ORI-YEM-08", option1Value: "8 in", priceCents: 4200, initialStock: STOCK, dimensions: statue(8) },
            { sku: "ORI-YEM-12", option1Value: "12 in", priceCents: 5800, initialStock: STOCK, dimensions: statue(12) },
        ],
    },
    {
        slug: "chango-statue",
        collection: "orishas",
        type: "statues",
        category: "chango",
        name: "Changó Statue",
        description: "Changó in red and white, holding his double-headed axe.",
        status: "ACTIVE",
        option1Name: "Size",
        material: STATUE,
        images: placeholders("Changó Statue", PHOTO.rosa1),
        variants: [
            { sku: "ORI-CHG-12", option1Value: "12 in", priceCents: 5400, initialStock: STOCK, dimensions: statue(12) },
        ],
    },

    //  ------------------------------------------------------------- Santa Muerte
    {
        slug: "santa-muerte-throne-statue",
        collection: "santa-muerte",
        type: "statues",
        featured: true,
        name: "Santa Muerte Throne Statue",
        description: "La Santa Muerte seated on her throne, holding the scythe and the globe.",
        status: "ACTIVE",
        option1Name: "Color",
        option2Name: "Size",
        material: STATUE,
        images: placeholders("Santa Muerte Throne Statue", PHOTO.jose1),
        variants: [
            { sku: "SMU-THR-BLA-08", option1Value: "Blanca", option2Value: "8 in", priceCents: 5200, initialStock: STOCK, dimensions: statue(8) },
            { sku: "SMU-THR-BLA-12", option1Value: "Blanca", option2Value: "12 in", priceCents: 6800, initialStock: STOCK, dimensions: statue(12) },
            { sku: "SMU-THR-ROJ-08", option1Value: "Roja", option2Value: "8 in", priceCents: 5200, initialStock: STOCK, dimensions: statue(8) },
            { sku: "SMU-THR-ROJ-12", option1Value: "Roja", option2Value: "12 in", priceCents: 6800, initialStock: STOCK, dimensions: [12, 7, 6] },
            { sku: "SMU-THR-NEG-12", option1Value: "Negra", option2Value: "12 in", priceCents: 6800, initialStock: STOCK, dimensions: statue(12) },
            { sku: "SMU-THR-DOR-12", option1Value: "Dorada", option2Value: "12 in", priceCents: 6800, initialStock: STOCK, dimensions: statue(12) },
            { sku: "SMU-THR-7CO-12", option1Value: "Siete colores", option2Value: "12 in", priceCents: 7200, initialStock: STOCK, dimensions: statue(12) },
        ],
    },
    {
        slug: "santa-muerte-scythe-statue",
        collection: "santa-muerte",
        type: "statues",
        name: "Santa Muerte Scythe Statue",
        description: "La Santa Muerte standing in her robe, the scythe raised in her right hand.",
        status: "ACTIVE",
        option1Name: "Color",
        option2Name: "Size",
        material: STATUE,
        images: placeholders("Santa Muerte Scythe Statue", PHOTO.rosa2),
        variants: [
            { sku: "SMU-SCY-BLA-08", option1Value: "Blanca", option2Value: "8 in", priceCents: 3400, initialStock: STOCK, dimensions: statue(8) },
            { sku: "SMU-SCY-ROJ-08", option1Value: "Roja", option2Value: "8 in", priceCents: 3400, initialStock: STOCK, dimensions: statue(8) },
            { sku: "SMU-SCY-ROJ-12", option1Value: "Roja", option2Value: "12 in", priceCents: 4800, initialStock: STOCK, dimensions: statue(12) },
            { sku: "SMU-SCY-MOR-08", option1Value: "Morada", option2Value: "8 in", priceCents: 3400, initialStock: STOCK, dimensions: statue(8) },
        ],
    },
    {
        slug: "santa-muerte-owl-statue",
        collection: "santa-muerte",
        type: "statues",
        name: "Santa Muerte Owl Statue",
        description: "La Santa Muerte with the owl at her feet, keeper of wisdom in the dark.",
        status: "ACTIVE",
        option1Name: "Color",
        option2Name: "Size",
        material: STATUE,
        images: placeholders("Santa Muerte Owl Statue", PHOTO.pilar2),
        variants: [
            { sku: "SMU-OWL-NEG-12", option1Value: "Negra", option2Value: "12 in", priceCents: 4600, initialStock: STOCK, dimensions: statue(12) },
            { sku: "SMU-OWL-ROJ-12", option1Value: "Roja", option2Value: "12 in", priceCents: 4600, initialStock: STOCK, dimensions: statue(12) },
            { sku: "SMU-OWL-VER-12", option1Value: "Verde", option2Value: "12 in", priceCents: 4600, initialStock: STOCK, dimensions: statue(12) },
        ],
    },
    {
        slug: "santa-muerte-globe-statue",
        collection: "santa-muerte",
        type: "statues",
        name: "Santa Muerte Globe Statue",
        description: "La Santa Muerte holding the world in her left hand.",
        status: "ACTIVE",
        option1Name: "Color",
        option2Name: "Size",
        material: STATUE,
        images: placeholders("Santa Muerte Globe Statue", PHOTO.cobre2),
        variants: [
            { sku: "SMU-GLB-ROJ-08", option1Value: "Roja", option2Value: "8 in", priceCents: 4000, initialStock: 0, dimensions: statue(8) },
            { sku: "SMU-GLB-DOR-08", option1Value: "Dorada", option2Value: "8 in", priceCents: 4000, initialStock: 0, dimensions: statue(8) },
        ],
    },
];
