import { userInfo } from "node:os";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The DB suite wipes tables between tests, so it runs against a throwaway
// local database, never the dev one (Preview shares it). test/db-global-setup.ts
// refuses any host that isn't local.
// Defaults to a Homebrew-style local Postgres, where the role is your OS user
// (Prisma doesn't infer it the way psql does). Written back to process.env so
// the global setup (same process) reads it too.
const TEST_DATABASE_URL = (process.env.TEST_DATABASE_URL ??=
  `postgresql://${userInfo().username}@localhost:5432/cannan_test`);

const shared = {
  resolve: {
    tsconfigPaths: true,
    // server-only throws outside a React Server Components bundle.
    alias: { "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)) },
  },
};

export default defineConfig({
  test: {
    projects: [
      {
        ...shared,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
          exclude: ["src/**/*.db.test.ts"],
        },
      },
      {
        ...shared,
        test: {
          name: "db",
          environment: "node",
          include: ["src/**/*.db.test.ts"],
          // Set before any test file imports @/lib/prisma. .env.local is never
          // loaded here, so DATABASE_URL can only be this.
          env: { DATABASE_URL: TEST_DATABASE_URL, POSTGRES_URL: TEST_DATABASE_URL },
          globalSetup: ["test/db-global-setup.ts"],
          // One shared database: files must not reset it under each other.
          fileParallelism: false,
        },
      },
    ],
  },
});
