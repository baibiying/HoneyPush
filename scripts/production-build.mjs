import { execSync } from "node:child_process";

const url =
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  "";
const isLocal = !url || /localhost|127\.0\.0\.1/.test(url);

const isVercel = process.env.VERCEL === "1";

if (isVercel && isLocal) {
  console.error(
    "❌ Production build: DATABASE_URL must be a cloud PostgreSQL URL.",
  );
  console.error(
    "   Add DATABASE_URL in Vercel project settings (e.g. Neon integration).",
  );
  process.exit(1);
}

if (isLocal) {
  console.warn(
    "⚠️  Skipping db:migrate — set DATABASE_URL before cloud deploy."
  );
} else {
  execSync("bun run db:migrate", { stdio: "inherit" });
}

execSync("bun run build", { stdio: "inherit" });
