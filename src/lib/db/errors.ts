import {
  isDatabaseUrlConfiguredForProduction,
  isProductionRuntime,
} from "@/lib/db/connection-url";

export function isDatabaseUnavailableError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const err = error as { code?: string; cause?: unknown };
  if (err.code === "ECONNREFUSED") return true;

  const cause = err.cause;
  if (cause && typeof cause === "object") {
    const aggregate = cause as { code?: string; errors?: Array<{ code?: string }> };
    if (aggregate.code === "ECONNREFUSED") return true;
    if (aggregate.errors?.some((item) => item.code === "ECONNREFUSED")) return true;
  }

  const message = String((error as { message?: string }).message ?? "");
  return (
    message.includes("ECONNREFUSED") ||
    message.includes("connect ECONNREFUSED") ||
    message.includes("ETIMEDOUT") ||
    message.includes("ECONNRESET") ||
    message.includes("timeout exceeded")
  );
}

export function databaseUnavailableResponse() {
  if (isProductionRuntime() && !isDatabaseUrlConfiguredForProduction()) {
    return {
      error:
        "生产环境未配置数据库。请在 Vercel 项目 Storage 中添加 Neon Postgres（会自动注入连接串），或在 Environment Variables 中设置 DATABASE_URL，然后重新部署。",
      code: "DATABASE_UNAVAILABLE",
    };
  }

  return {
    error:
      "数据库未连接。请先启动 PostgreSQL（例如运行 docker compose up -d），再执行 npm run db:migrate。",
    code: "DATABASE_UNAVAILABLE",
  };
}
