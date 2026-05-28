import { unlockBrowserAudio } from "@/lib/unlock-browser-audio";

export type VideoPlayResult = "unmuted" | "muted" | "failed";

/** Warm the browser cache for a local / remote video URL. */
export function preloadVideoAsset(src: string) {
  if (typeof document === "undefined" || !src) return;
  const el = document.createElement("video");
  el.preload = "auto";
  el.muted = true;
  el.playsInline = true;
  el.src = src;
  try {
    el.load();
  } catch {
    /* ignore */
  }
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
