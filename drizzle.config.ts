import { config } from "dotenv";
import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

const envFile = [".env.production", ".env"].find((name) => existsSync(name));
if (envFile) config({ path: envFile });

export default defineConfig({
  schema: "./src/lib/db/schema",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/honeypush",
  },
});
