import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadEnvFile } from "@/lib/env/load-env-file";
import { resolveDatabaseUrl } from "@/lib/db/connection-url";

loadEnvFile();

const client = postgres(resolveDatabaseUrl(), {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

export const db = drizzle(client);
