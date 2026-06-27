import { execSync } from "node:child_process";
import { loadEnvFile } from "./load-env-file.mjs";

loadEnvFile();

const url =
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  "";
const isLocal = !url || /localhost|127\.0\.0\.1/.test(url);

if (!isLocal) {
  execSync("node ./node_modules/tsx/dist/cli.mjs src/lib/db/migrate.ts", {
    stdio: "inherit",
    env: process.env,
  });
} else {
  console.warn("⚠️  DATABASE_URL points to localhost — skipping migrations.");
}

console.log("▶ Starting Next.js...");
execSync("node server.js", { stdio: "inherit", env: process.env });
