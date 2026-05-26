let audioContext: AudioContext | null = null;
let unlocked = false;

/** 在用户手势链路上调用（如开启摄像头），便于后续带声 autoplay */
export async function unlockBrowserAudio(): Promise<void> {
  if (unlocked) return;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioContext = audioContext ?? new Ctor();
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    unlocked = true;
  } catch {
    /* ignore */
  }
}
