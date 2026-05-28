import { execSync } from "node:child_process";

const url =
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  "";
const isLocal = !url || /localhost|127\.0\.0\.1/.test(url);

if (process.env.VERCEL === "1" && isLocal) {
  console.error(
    "❌ Production build: DATABASE_URL must be a cloud PostgreSQL URL (Neon, Supabase, etc.).",
  );
  console.error(
    "   Add it in Vercel → Project → Settings → Environment Variables, then redeploy.",
  );
  process.exit(1);
}

if (isLocal) {
  console.warn(
    "⚠️  Skipping db:migrate — set DATABASE_URL in Vercel (Neon/Supabase) and redeploy."
  );
} else {
  execSync("bun run db:migrate", { stdio: "inherit" });
}

execSync("bun run build", { stdio: "inherit" });
