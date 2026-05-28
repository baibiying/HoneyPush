import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL?.trim() ?? "";
const isLocal =
  !url || /localhost|127\.0\.0\.1/.test(url);

if (isLocal) {
  console.warn(
    "⚠️  Skipping db:migrate — set DATABASE_URL in Vercel (Neon/Supabase) and redeploy."
  );
} else {
  execSync("bun run db:migrate", { stdio: "inherit" });
}

execSync("bun run build", { stdio: "inherit" });
