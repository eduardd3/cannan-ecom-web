// Runs once before the DB suite: checks the target is a local database, then
// brings its schema up to date with the migrations in the repo.
import { execFileSync } from "node:child_process";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("DB tests: TEST_DATABASE_URL is not set (see vitest.config.mts)");

  // Every test truncates tables. A remote host means a misconfiguration
  // pointing at dev or production, so stop before touching anything.
  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`DB tests refuse to run against non-local host "${host}"`);
  }

  // prisma.config.ts loads .env.local, but dotenv never overrides a variable
  // that's already set, so POSTGRES_URL here wins.
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, POSTGRES_URL: url },
    stdio: "inherit",
  });
}
