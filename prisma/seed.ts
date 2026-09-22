import "dotenv/config";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";

//  seed db with initial data

function requireEnv(name: string, hint: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not set — ${hint}`);
    }
    return value;
}

const connectionString = requireEnv("DATABASE_URL", "add it to .env before seeding.");
const adminEmail = requireEnv("SEED_ADMIN_EMAIL", "add it to .env before seeding.");
//  never fall back to a default password: an empty or guessable admin password is a live account
const adminPassword = requireEnv(
    "SEED_ADMIN_PASSWORD",
    "add it to .env before seeding so the admin is not created with an empty password.",
);

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    //  upsert -> updates an existing row, so re-running the seed is safe
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: { password: hashedPassword, role: Role.ADMIN },
        create: { email: adminEmail, password: hashedPassword, role: Role.ADMIN },
    });

    //  never log the password hash
    console.log(`Seeded admin: ${admin.email} (id ${admin.id}, role ${admin.role})`);
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
