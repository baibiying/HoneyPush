let audioContext: AudioContext | null = null;
let unlocked = false;
let unmutedVideoPrimed = false;

/** 在用户手势链路上同步调用（须在 await 之前），便于后续带声 autoplay */
export function unlockBrowserAudioSync(): void {
  if (unlocked) return;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioContext = audioContext ?? new Ctor();
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }
    unlocked = true;
  } catch {
    /* ignore */
  }
}

/** 在用户手势链路上调用（如开启摄像头），便于后续带声 autoplay */
export async function unlockBrowserAudio(): Promise<void> {
  unlockBrowserAudioSync();
  if (!audioContext || audioContext.state !== "suspended") return;
  try {
    await audioContext.resume();
  } catch {
    /* ignore */
  }
}

export function isUnmutedVideoPrimed() {
  return unmutedVideoPrimed;
}

/**
 * 在用户点击/触摸的同步阶段调用（不要先 await 再调用），
 * 解锁后续监督官视频的有声自动播放。
 */
export function primeUnmutedVideoPlayback(src: string): void {
  if (unmutedVideoPrimed || typeof document === "undefined") return;

  unlockBrowserAudioSync();

  const video = document.createElement("video");
  video.setAttribute("playsinline", "");
  video.playsInline = true;
  video.muted = false;
  video.volume = 1;
  video.preload = "auto";
  video.src = src;
  video.style.cssText =
    "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:-9999px";

  document.body.appendChild(video);

  try {
    const playPromise = video.play();
    if (!playPromise) return;

    void playPromise
      .then(() => {
        unmutedVideoPrimed = true;
        video.pause();
        try {
          video.currentTime = 0;
        } catch {
          /* ignore */
        }
      })
      .catch((err) => {
        console.warn("[media] prime unmuted video failed:", err);
      })
      .finally(() => {
        video.remove();
      });
  } catch (err) {
    console.warn("[media] prime unmuted video threw:", err);
    video.remove();
  }
}
