import {
  HANDS_BASELINE_FACTOR,
  HANDS_MIN_SKIN_RATIO,
} from "./config";

type FaceBox = { x: number; y: number; width: number; height: number };

let sampleCanvas: HTMLCanvasElement | null = null;
let sampleCtx: CanvasRenderingContext2D | null = null;

function ensureSampleContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!sampleCanvas) {
    sampleCanvas = document.createElement("canvas");
    sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  }
  return sampleCtx;
}

/** YCbCr 肤色启发式（采样步长 2，兼顾性能与稳定性） */
function isSkinPixel(r: number, g: number, b: number): boolean {
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;
}

/**
 * 脸框下方工作区内的肤色像素占比（0～1）。
 * 双手在桌面时该值通常明显高于手离开画面时。
 */
export function measureWorkspaceSkinRatio(
  video: HTMLVideoElement,
  faceBox: FaceBox
): number {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw <= 0 || vh <= 0) return 0;

  const ctx = ensureSampleContext();
  if (!ctx || !sampleCanvas) return 0;

  const gap = Math.max(4, faceBox.height * 0.06);
  const sy = Math.min(vh - 1, Math.floor(faceBox.y + faceBox.height + gap));
  const ey = vh;
  const sx = 0;
  const ex = vw;
  const rw = ex - sx;
  const rh = ey - sy;
  if (rw < 12 || rh < 12) return 0;

  const SAMPLE_W = 112;
  const SAMPLE_H = Math.max(36, Math.min(80, Math.round((SAMPLE_W * rh) / rw)));
  sampleCanvas.width = SAMPLE_W;
  sampleCanvas.height = SAMPLE_H;

  try {
    ctx.drawImage(video, sx, sy, rw, rh, 0, 0, SAMPLE_W, SAMPLE_H);
  } catch {
    return 0;
  }

  const data = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
  let skin = 0;
  let total = 0;
  const step = 2;
  for (let y = 0; y < SAMPLE_H; y += step) {
    for (let x = 0; x < SAMPLE_W; x += step) {
      const i = (y * SAMPLE_W + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      total += 1;
      if (isSkinPixel(r, g, b)) skin += 1;
    }
  }
  if (total === 0) return 0;
  return skin / total;
}

export function handsLikelyInWorkspace(
  skinRatio: number,
  enrollmentBaseline: number | null
): boolean {
  const absoluteMin = HANDS_MIN_SKIN_RATIO;
  const relativeMin =
    enrollmentBaseline != null && enrollmentBaseline > 0
      ? enrollmentBaseline * HANDS_BASELINE_FACTOR
      : 0;
  const threshold = Math.max(absoluteMin, relativeMin);
  return skinRatio >= threshold;
}
