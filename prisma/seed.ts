import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import { withVerifyFullSsl } from "@/lib/db-url";
import { validateAdjustment } from "@/lib/inventory/rules";
import { SEED_BRAND, SEED_CATEGORIES, SEED_PRODUCTS, type SeedImage, type SeedProduct } from "./seed-catalog";

config({ path: ".env.local" });

//  seed db with initial data

function requireEnv(name: string, hint: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not set — ${hint}`);
    }
    return value;
}

const connectionString = withVerifyFullSsl(requireEnv("DATABASE_URL", "add it to .env.local before seeding."));
const adminEmail = requireEnv("SEED_ADMIN_EMAIL", "add it to .env.local before seeding.");
//  never fall back to a default password: an empty or guessable admin password is a live account
const adminPassword = requireEnv(
    "SEED_ADMIN_PASSWORD",
    "add it to .env.local before seeding so the admin is not created with an empty password.",
);

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    //  upsert -> updates an existing row, so re-running the seed is safe
    //  the admin address is ours, so mark it verified (hides the storefront banner)
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: { password: hashedPassword, role: Role.ADMIN },
        create: { email: adminEmail, password: hashedPassword, role: Role.ADMIN, emailVerified: new Date() },
    });

    //  never log the password hash
    console.log(`Seeded admin: ${admin.email} (id ${admin.id}, role ${admin.role})`);

    await seedCatalog();
}

//  The seed owns the catalog: every product, and the categories it lists.
//  Re-running it upserts by slug and SKU, then retires what it no longer
//  lists. Nothing is deleted except unused categories: variants are kept
//  for the stock ledger and past orders (Restrict), so a retired product is
//  ARCHIVED with its variants off. Users, carts, and orders aren't touched;
//  a cart holding a retired variant shows it as unavailable.
//
//  Collections and product types come from migrations; they're looked up by slug.
async function seedCatalog() {
    if (SEED_PRODUCTS.length === 0) {
        console.log("No seed products defined (prisma/seed-catalog.ts); skipping catalog.");
        return;
    }
    SEED_PRODUCTS.forEach(checkProduct);

    const collectionIds = new Map(
        (await prisma.collection.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]),
    );
    const typeIds = new Map(
        (await prisma.productType.findMany({ select: { id: true, slug: true } })).map((t) => [t.slug, t.id]),
    );
    const lookup = (map: Map<string, number>, slug: string, what: string) => {
        const id = map.get(slug);
        if (!id) throw new Error(`unknown ${what} "${slug}"`);
        return id;
    };

    //  slug -> [id, collection slug]
    const categories = new Map<string, [number, string]>();
    for (const c of SEED_CATEGORIES) {
        const data = {
            name: c.name,
            description: c.description ?? null,
            collectionId: lookup(collectionIds, c.collection, "collection"),
        };
        const category = await prisma.category.upsert({
            where: { slug: c.slug },
            update: data,
            create: { slug: c.slug, ...data },
        });
        categories.set(c.slug, [category.id, c.collection]);
    }

    for (const p of SEED_PRODUCTS) {
        let categoryId: number | null = null;
        if (p.category) {
            const category = categories.get(p.category);
            if (!category) throw new Error(`${p.slug}: unknown category "${p.category}"`);
            if (category[1] !== p.collection) throw new Error(`${p.slug}: category "${p.category}" is in another collection`);
            categoryId = category[0];
        }

        //  An ACTIVE product needs publishedAt (CHECK in SQL). Keep an existing
        //  one: it records the first listing, not this seed run.
        const existing = await prisma.product.findUnique({ where: { slug: p.slug }, select: { publishedAt: true } });
        const publishedAt = existing?.publishedAt ?? (p.status === "ACTIVE" ? new Date() : null);

        const data = {
            name: p.name,
            description: p.description,
            status: p.status,
            publishedAt,
            collectionId: lookup(collectionIds, p.collection, "collection"),
            productTypeId: lookup(typeIds, p.type, "product type"),
            categoryId,
            featured: p.featured ?? false,
            option1Name: p.option1Name ?? null,
            option2Name: p.option2Name ?? null,
            material: p.material ?? null,
            brand: p.brand ?? SEED_BRAND,
            isFinalSale: p.isFinalSale ?? false,
        };
        const product = await prisma.product.upsert({
            where: { slug: p.slug },
            update: data,
            create: { slug: p.slug, ...data },
        });

        //  Variants this product had before but the seed no longer lists
        //  (e.g. an earlier seed's default variant): off, not deleted. Their
        //  values may not match the new option names; turning one back on in
        //  the admin is refused for that reason.
        const skus = p.variants.map((v) => v.sku);
        await prisma.productVariant.updateMany({
            where: { productId: product.id, sku: { notIn: skus } },
            data: { isActive: false },
        });

        //  Images are replaced wholesale on each run; nothing references them.
        await prisma.productImage.deleteMany({ where: { productId: product.id } });
        await createImages(product.id, null, p.images);

        for (const [position, v] of p.variants.entries()) {
            const [heightIn, widthIn, depthIn] = v.dimensions ?? [null, null, null];
            const variantData = {
                productId: product.id,
                option1Value: v.option1Value ?? null,
                option2Value: v.option2Value ?? null,
                heightIn,
                widthIn,
                depthIn,
                priceCents: v.priceCents,
                amazonAsin: v.amazonAsin ?? null,
                position,
            };
            //  Never touches stock: new variants start at 0 and get their
            //  opening count from the ledger below.
            const variant = await prisma.productVariant.upsert({
                where: { sku: v.sku },
                update: { ...variantData, isActive: true },
                create: { ...variantData, sku: v.sku, stock: 0 },
            });
            await createImages(product.id, variant.id, v.images ?? []);
            await seedOpeningStock(variant.id, v.initialStock);
        }

        console.log(`Seeded product: ${p.slug} (${p.variants.length} variant(s), ${p.status})`);
    }

    await retireUnlisted();
}

//  Option rules a CHECK can't express (the names are on the product, the
//  values on its variants): a variant's values are set exactly where the
//  product has option names. Checked before anything is written.
function checkProduct(p: SeedProduct) {
    if (p.option2Name && !p.option1Name) throw new Error(`${p.slug}: option2Name without option1Name`);
    const seen = new Set<string>();
    for (const v of p.variants) {
        const pairs = [
            [p.option1Name, v.option1Value],
            [p.option2Name, v.option2Value],
        ] as const;
        for (const [name, value] of pairs) {
            if (Boolean(name) !== Boolean(value)) {
                throw new Error(`${v.sku}: option values must be set exactly where ${p.slug} has option names`);
            }
        }
        const key = `${v.option1Value ?? ""}\u0000${v.option2Value ?? ""}`.toLowerCase();
        if (seen.has(key)) throw new Error(`${v.sku}: ${p.slug} already has a variant with these options`);
        seen.add(key);
    }
}

//  Products and categories from outside this file (earlier seeds, admin
//  testing) leave the dev catalog.
async function retireUnlisted() {
    const listed = SEED_PRODUCTS.map((p) => p.slug);
    const retired = await prisma.product.findMany({
        where: { slug: { notIn: listed }, OR: [{ status: { not: "ARCHIVED" } }, { categoryId: { not: null } }] },
        select: { id: true, slug: true },
    });
    for (const product of retired) {
        await prisma.$transaction([
            prisma.product.update({ where: { id: product.id }, data: { status: "ARCHIVED", categoryId: null } }),
            prisma.productVariant.updateMany({ where: { productId: product.id }, data: { isActive: false } }),
        ]);
        console.log(`Retired product: ${product.slug} (ARCHIVED, variants off)`);
    }

    const { count } = await prisma.category.deleteMany({
        where: { slug: { notIn: SEED_CATEGORIES.map((c) => c.slug) }, products: { none: {} } },
    });
    if (count > 0) console.log(`Deleted ${count} unused category(ies)`);
}

async function createImages(productId: number, variantId: number | null, images: SeedImage[]) {
    for (const [position, image] of images.entries()) {
        if (!existsSync(path.join("public/seed-images", image.key))) {
            console.warn(`  missing image file: public/seed-images/${image.key}`);
        }
        await prisma.productImage.create({
            data: { productId, variantId, key: image.key, alt: image.alt, position },
        });
    }
}

//  A seed-side copy of adjustStock (src/lib/inventory/adjust.ts), which can't
//  be imported here: it pulls in server-only and the app's Prisma client.
//  Same shape: stock and its ledger row change in one transaction.
//
//  Runs once per variant. Any existing ledger row means the variant already
//  has history, so re-seeding never stacks a second INITIAL_STOCK.
async function seedOpeningStock(variantId: number, quantity: number) {
    if (quantity === 0) return;
    const problem = validateAdjustment(quantity, "INITIAL_STOCK", null);
    if (problem) throw new Error(`variant ${variantId}: ${problem}`);

    await prisma.$transaction(async (tx) => {
        const history = await tx.inventoryAdjustment.count({ where: { variantId } });
        if (history > 0) return;

        const { stock: stockAfter } = await tx.productVariant.update({
            where: { id: variantId },
            data: { stock: { increment: quantity } },
            select: { stock: true },
        });
        await tx.inventoryAdjustment.create({
            data: { variantId, delta: quantity, stockAfter, reason: "INITIAL_STOCK", note: "Dev seed" },
        });
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(async () => {    //  close connection
        await prisma.$disconnect();
        await pool.end();
    });
