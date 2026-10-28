// scripts/vercel-build.mjs
//
// Vercel runs the "vercel-build" script instead of "build" when it exists.
// Local `npm run build` stays plain `next build`.
//
// Build first, then migrate: code that doesn't compile never touches the
// database. A failed migration fails the build, so Vercel keeps the previous
// deployment live. Postgres rolls back the failed migration; ones applied
// before it in the same run stay applied.
//
// Production only: Preview and Development share the dev database, and an
// unmerged branch must not change the schema everyone's Preview uses.

import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/** @param {string | undefined} vercelEnv */
export function shouldMigrate(vercelEnv) {
  return vercelEnv === "production";
}

// The project's own binaries, with output in the Vercel build log. Exits with
// the command's code on failure, so later steps never run.
function run(command, args) {
  const result = spawnSync("npx", ["--no-install", command, ...args], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function main() {
  run("next", ["build"]);
  if (shouldMigrate(process.env.VERCEL_ENV)) {
    run("prisma", ["migrate", "deploy"]);
  } else {
    console.log(`Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"})`);
  }
}

// Only when run as a script, not when the test imports shouldMigrate.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
