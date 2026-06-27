export type RequestOptions = RequestInit & {
  /** Extra attempts after the first try (default 2 → 3 total). */
  retries?: number;
  /** Base delay between retries; multiplied by attempt index. */
  retryDelayMs?: number;
  /** Abort the request if no response within this window. */
  timeoutMs?: number;
};

export type RequestFailureKind = "timeout" | "network" | "unknown";

const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 400;
const DEFAULT_TIMEOUT_MS = 15_000;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isIdempotentMethod(method?: string) {
  const m = (method ?? "GET").toUpperCase();
  return m === "GET" || m === "HEAD";
}

export function isRetryableNetworkError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (!(error instanceof TypeError)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed") ||
    msg.includes("aborted")
  );
}

export function classifyRequestError(error: unknown): RequestFailureKind {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "timeout";
  }
  if (isRetryableNetworkError(error)) {
    return "network";
  }
  return "unknown";
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function shouldRetryResponse(method: string | undefined, status: number) {
  if (isRetryableStatus(status)) {
    return isIdempotentMethod(method) || status >= 502;
  }
  return false;
}

function createTimeoutSignal(timeoutMs: number, parent?: AbortSignal | null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const cleanup = () => {
    clearTimeout(timer);
  };

  if (parent) {
    if (parent.aborted) {
      cleanup();
      controller.abort();
    } else {
      parent.addEventListener(
        "abort",
        () => {
          cleanup();
          controller.abort();
        },
        { once: true },
      );
    }
  }

  return { signal: controller.signal, cleanup };
}

/**
 * fetch wrapper with credentials, timeout, and automatic retry for transient
 * network failures (e.g. VPN connect/disconnect → ERR_NETWORK_CHANGED).
 */
export async function request(
  input: RequestInfo | URL,
  init: RequestOptions = {},
): Promise<Response> {
  const {
    retries = DEFAULT_RETRIES,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: parentSignal,
    ...fetchInit
  } = init;
  const maxAttempts = Math.max(1, retries + 1);
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { signal, cleanup } = createTimeoutSignal(timeoutMs, parentSignal);

    try {
      const res = await fetch(input, {
        ...fetchInit,
        credentials: "include",
        headers: fetchInit.headers,
        signal,
      });
      cleanup();

      if (attempt < maxAttempts - 1 && shouldRetryResponse(fetchInit.method, res.status)) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }

      return res;
    } catch (error) {
      cleanup();
      lastError = error;
      if (attempt < maxAttempts - 1 && isRetryableNetworkError(error)) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("Request failed");
}
