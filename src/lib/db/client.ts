import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { resolveDatabaseUrl } from "@/lib/db/connection-url";

config({ path: ".env" });

const client = postgres(resolveDatabaseUrl());

export const db = drizzle(client);
