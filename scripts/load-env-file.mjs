import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

const PROD_CANDIDATES = [".env.production.local", ".env.production"];
const DEV_CANDIDATES = [".env.local", ".env"];

function pickEnvFile() {
  const cwd = process.cwd();
  const candidates =
    process.env.NODE_ENV === "production" ? PROD_CANDIDATES : DEV_CANDIDATES;

  for (const name of candidates) {
    const filePath = path.join(cwd, name);
    if (existsSync(filePath)) return filePath;
  }

  return null;
}

export function loadEnvFile() {
  const filePath = pickEnvFile();
  if (!filePath) return null;
  config({ path: filePath });
  return filePath;
}
