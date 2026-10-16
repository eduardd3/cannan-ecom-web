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
import { SEED_CATEGORIES, SEED_PRODUCTS, type SeedImage } from "./seed-catalog";

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

//  Each product names its collection by slug; the collections themselves come
//  from the collections_and_categories migration.
async function seedCatalog() {
    if (SEED_PRODUCTS.length === 0) {
        console.log("No seed products defined (prisma/seed-catalog.ts); skipping catalog.");
        return;
    }

    const collectionIds = new Map(
        (await prisma.collection.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]),
    );

    const categoryIds = new Map<string, number>();
    for (const c of SEED_CATEGORIES) {
        const category = await prisma.category.upsert({
            where: { slug: c.slug },
            update: { name: c.name, description: c.description ?? null },
            create: { slug: c.slug, name: c.name, description: c.description ?? null },
        });
        categoryIds.set(c.slug, category.id);
    }

    for (const p of SEED_PRODUCTS) {
        const categoryLinks = p.categories.map((slug) => {
            const categoryId = categoryIds.get(slug);
            if (!categoryId) throw new Error(`${p.slug}: unknown category "${slug}"`);
            return { categoryId };
        });
        const collectionId = collectionIds.get(p.collection);
        if (!collectionId) throw new Error(`${p.slug}: unknown collection "${p.collection}"`);
        const featured = p.featured ?? false;

        //  An ACTIVE product needs publishedAt (CHECK in SQL). Keep an existing
        //  one: it records the first listing, not this seed run.
        const existing = await prisma.product.findUnique({ where: { slug: p.slug }, select: { publishedAt: true } });
        const publishedAt = existing?.publishedAt ?? (p.status === "ACTIVE" ? new Date() : null);

        const product = await prisma.product.upsert({
            where: { slug: p.slug },
            update: {
                name: p.name,
                description: p.description,
                status: p.status,
                publishedAt,
                collectionId,
                featured,
                categories: { deleteMany: {}, create: categoryLinks },
            },
            create: {
                slug: p.slug,
                name: p.name,
                description: p.description,
                status: p.status,
                publishedAt,
                collectionId,
                featured,
                categories: { create: categoryLinks },
            },
        });

        //  Images are replaced wholesale on each run; nothing references them.
        await prisma.productImage.deleteMany({ where: { productId: product.id } });
        await createImages(product.id, null, p.images);

        for (const [position, v] of p.variants.entries()) {
            //  Never touches stock: new variants start at 0 and get their
            //  opening count from the ledger below.
            const variant = await prisma.productVariant.upsert({
                where: { sku: v.sku },
                update: {
                    productId: product.id,
                    name: v.name,
                    value: v.value,
                    priceCents: v.priceCents,
                    amazonAsin: v.amazonAsin ?? null,
                    position,
                    isActive: true,
                },
                create: {
                    productId: product.id,
                    sku: v.sku,
                    name: v.name,
                    value: v.value,
                    priceCents: v.priceCents,
                    stock: 0,
                    amazonAsin: v.amazonAsin ?? null,
                    position,
                },
            });
            await createImages(product.id, variant.id, v.images ?? []);
            await seedOpeningStock(variant.id, v.initialStock);
        }

        console.log(`Seeded product: ${p.slug} (${p.variants.length} variant(s), ${p.status})`);
    }
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
