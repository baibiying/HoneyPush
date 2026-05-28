import { unlockBrowserAudioSync } from "@/lib/unlock-browser-audio";

const MUTE_STORAGE_KEY = "honeypush-game-sfx-muted";

let sharedContext: AudioContext | null = null;
let lastHoverAt = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  unlockBrowserAudioSync();
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    sharedContext = sharedContext ?? new Ctor();
    if (sharedContext.state === "suspended") {
      void sharedContext.resume();
    }
    return sharedContext;
  } catch {
    return null;
  }
}

export function isGameSfxMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setGameSfxMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (muted) localStorage.setItem(MUTE_STORAGE_KEY, "1");
    else localStorage.removeItem(MUTE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function scheduleTone(
  ctx: AudioContext,
  start: number,
  frequency: number,
  duration: number,
  peakGain: number,
  type: OscillatorType = "sine"
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peakGain, start + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** 按钮点击：双音上行菜单确认（类似 RPG 选单 / 金币轻响） */
export function playGameClick() {
  if (isGameSfxMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // 主音 + 大三度，短促柔和
  scheduleTone(ctx, now, 587.33, 0.055, 0.09); // D5
  scheduleTone(ctx, now + 0.038, 739.99, 0.075, 0.075); // F#5

  // 极轻噪声瞬态，增加「按键」质感（音量很低）
  const bufferSize = Math.floor(ctx.sampleRate * 0.012);
  const noise = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2200;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.028, now);
  nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);
  src.connect(filter);
  filter.connect(nGain);
  nGain.connect(ctx.destination);
  src.start(now);
  src.stop(now + 0.015);
}

/** 岛屿 / 可交互项悬停：轻量上行哔声 */
export function playGameHover() {
  if (isGameSfxMuted()) return;
  const wall = Date.now();
  if (wall - lastHoverAt < 90) return;
  lastHoverAt = wall;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(1320, now + 0.04);
  gain.gain.setValueAtTime(0.045, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.055);
}

const INTERACTIVE_SELECTOR = [
  "button:not(:disabled)",
  '[role="button"]:not([aria-disabled="true"])',
  'a[href]:not([aria-disabled="true"])',
  'input[type="button"]:not(:disabled)',
  'input[type="submit"]:not(:disabled)',
  'input[type="reset"]:not(:disabled)',
].join(", ");

export function isGameSfxClickTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('[data-game-sfx="off"]')) return false;
  if (target.closest('[data-game-sfx="click"]')) return true;
  const el = target.closest(INTERACTIVE_SELECTOR);
  return Boolean(el);
}

export function handleGameSfxClick(event: MouseEvent) {
  if (event.button !== 0) return;
  if (!isGameSfxClickTarget(event.target)) return;
  playGameClick();
}
