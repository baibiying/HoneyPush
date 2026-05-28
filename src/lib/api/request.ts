export type RequestOptions = RequestInit & {
  /** Extra attempts after the first try (default 2 → 3 total). */
  retries?: number;
  /** Base delay between retries; multiplied by attempt index. */
  retryDelayMs?: number;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isIdempotentMethod(method?: string) {
  const m = (method ?? "GET").toUpperCase();
  return m === "GET" || m === "HEAD";
}

function isRetryableNetworkError(error: unknown) {
  if (!(error instanceof TypeError)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed") ||
    msg.includes("aborted")
  );
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

/**
 * fetch wrapper with credentials and automatic retry for transient network
 * failures (e.g. VPN connect/disconnect → ERR_NETWORK_CHANGED).
 */
export async function request(
  input: RequestInfo | URL,
  init: RequestOptions = {}
): Promise<Response> {
  const { retries = 2, retryDelayMs = 500, ...fetchInit } = init;
  const maxAttempts = Math.max(1, retries + 1);
  const idempotent = isIdempotentMethod(fetchInit.method);
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(input, {
        ...fetchInit,
        credentials: "include",
        headers: fetchInit.headers,
      });

      if (
        idempotent &&
        attempt < maxAttempts - 1 &&
        isRetryableStatus(res.status)
      ) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }

      return res;
    } catch (error) {
      lastError = error;
      if (
        idempotent &&
        attempt < maxAttempts - 1 &&
        isRetryableNetworkError(error)
      ) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("Request failed");
}
