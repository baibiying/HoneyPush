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

/** Vercel + Neon integration may inject POSTGRES_URL instead of DATABASE_URL. */
export function readDatabaseUrlFromEnv(): string | undefined {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    undefined
  );
}

/** Connection string for app runtime and migrations. */
export function resolveDatabaseUrl(): string {
  const url = readDatabaseUrlFromEnv();
  if (url) return url;

  if (isProductionRuntime()) {
    throw new Error(
      "DATABASE_URL is not set. Configure a cloud PostgreSQL URL in Vercel environment variables."
    );
  }

  return DEV_FALLBACK;
}

export function isDatabaseUrlConfiguredForProduction() {
  const url = readDatabaseUrlFromEnv();
  return Boolean(url && !isLocalDatabaseUrl(url));
}
