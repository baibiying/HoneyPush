const DEV_FALLBACK =
  "postgresql://postgres:postgres@localhost:5432/honeypush";

export function isLocalDatabaseUrl(url: string) {
  return /localhost|127\.0\.0\.1/.test(url);
}

export function isProductionRuntime() {
  return (
    process.env.VERCEL === "1" ||
    process.env.NODE_ENV === "production"
  );
}

/** Pooled URLs are preferred for serverless runtime (Neon / Vercel). */
export function readPooledDatabaseUrlFromEnv(): string | undefined {
  return (
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    undefined
  );
}

/** Direct URLs are preferred for migrations and long-lived connections. */
export function readDirectDatabaseUrlFromEnv(): string | undefined {
  return (
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    readPooledDatabaseUrlFromEnv()
  );
}

/** @deprecated Use readPooledDatabaseUrlFromEnv(). */
export function readDatabaseUrlFromEnv(): string | undefined {
  return readPooledDatabaseUrlFromEnv();
}

/** Connection string for app runtime (serverless-safe pooled URL). */
export function resolveDatabaseUrl(): string {
  const url = readPooledDatabaseUrlFromEnv();
  if (url) return url;

  if (isProductionRuntime()) {
    throw new Error(
      "DATABASE_URL is not set. Configure a cloud PostgreSQL URL in Vercel environment variables."
    );
  }

  return DEV_FALLBACK;
}

/** Connection string for migrations. */
export function resolveMigrationDatabaseUrl(): string {
  const url = readDirectDatabaseUrlFromEnv();
  if (url) return url;

  if (isProductionRuntime()) {
    throw new Error(
      "DATABASE_URL is not set. Configure a cloud PostgreSQL URL in Vercel environment variables."
    );
  }

  return DEV_FALLBACK;
}

export function isDatabaseUrlConfiguredForProduction() {
  const url = readPooledDatabaseUrlFromEnv();
  return Boolean(url && !isLocalDatabaseUrl(url));
}
