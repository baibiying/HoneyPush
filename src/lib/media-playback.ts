import { unlockBrowserAudio } from "@/lib/unlock-browser-audio";

export type VideoPlayResult = "unmuted" | "muted" | "failed";

const PRELOAD_POOL = new Map<string, HTMLVideoElement>();
const PRELOAD_LINKS = new Set<string>();
let poolContainer: HTMLDivElement | null = null;

/** HTMLMediaElement.HAVE_FUTURE_DATA — avoid referencing HTMLMediaElement at module scope (SSR). */
const PRELOAD_READY_STATE = 3;
const PRELOAD_TIMEOUT_MS = 60_000;

function getPoolContainer() {
  if (typeof document === "undefined") return null;
  if (!poolContainer) {
    poolContainer = document.createElement("div");
    poolContainer.id = "honeypush-video-preload-pool";
    poolContainer.setAttribute("aria-hidden", "true");
    poolContainer.style.cssText =
      "position:fixed;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;left:-9999px;top:-9999px";
    document.body.appendChild(poolContainer);
  }
  return poolContainer;
}

function injectLinkPreload(src: string) {
  if (typeof document === "undefined" || PRELOAD_LINKS.has(src)) return;
  PRELOAD_LINKS.add(src);
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "video";
  link.href = src;
  document.head.appendChild(link);
}

export function isVideoPreloaded(src: string) {
  const el = PRELOAD_POOL.get(src);
  return Boolean(el && el.readyState >= PRELOAD_READY_STATE);
}

/** 将视频放入隐藏池并缓冲到可播放 */
export function preloadVideoAsset(src: string): Promise<void> {
  if (typeof document === "undefined" || !src) return Promise.resolve();

  const cached = PRELOAD_POOL.get(src);
  if (cached && cached.readyState >= PRELOAD_READY_STATE) {
    return Promise.resolve();
  }

  if (cached) {
    return waitForVideoReady(cached);
  }

  injectLinkPreload(src);

  const el = document.createElement("video");
  el.preload = "auto";
  el.muted = true;
  el.playsInline = true;
  el.setAttribute("playsinline", "");
  el.src = src;

  const container = getPoolContainer();
  container?.appendChild(el);
  PRELOAD_POOL.set(src, el);

  try {
    el.load();
  } catch {
    /* ignore */
  }

  return waitForVideoReady(el);
}

function waitForVideoReady(el: HTMLVideoElement): Promise<void> {
  if (el.readyState >= PRELOAD_READY_STATE) return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => {
      cleanup();
      resolve();
    };

    const onReady = () => finish();
    const onError = () => finish();

    const cleanup = () => {
      window.clearTimeout(timer);
      el.removeEventListener("canplaythrough", onReady);
      el.removeEventListener("loadeddata", onReady);
      el.removeEventListener("error", onError);
    };

    el.addEventListener("canplaythrough", onReady, { once: true });
    el.addEventListener("loadeddata", onReady, { once: true });
    el.addEventListener("error", onError, { once: true });

    const timer = window.setTimeout(finish, PRELOAD_TIMEOUT_MS);
  });
}

export async function preloadVideoAssetsParallel(
  sources: string[],
  options?: { concurrency?: number }
) {
  const urls = [...new Set(sources.filter(Boolean))];
  if (urls.length === 0) return;

  const concurrency = Math.max(1, options?.concurrency ?? 2);
  let index = 0;

  const worker = async () => {
    while (index < urls.length) {
      const current = urls[index];
      index += 1;
      await preloadVideoAsset(current);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, urls.length) }, () => worker())
  );
}

/**
 * Try unmuted play first; fall back to muted so the picture is visible,
 * then the UI can prompt the user to tap for sound.
 */
export async function playVideoRobust(
  el: HTMLVideoElement,
  options?: { allowMutedFallback?: boolean }
): Promise<VideoPlayResult> {
  const allowMuted = options?.allowMutedFallback !== false;

  await unlockBrowserAudio();

  el.playsInline = true;
  el.muted = false;
  el.volume = 1;

  try {
    await el.play();
    return "unmuted";
  } catch (err) {
    console.warn("[video] unmuted play failed:", err);
    if (!allowMuted) return "failed";
  }

  try {
    el.muted = true;
    await el.play();
    return "muted";
  } catch (err) {
    console.warn("[video] muted play failed:", err);
    return "failed";
  }
}
