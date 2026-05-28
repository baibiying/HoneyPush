/** face-api.js weights (same files as public/models). */
export const FACE_API_WEIGHTS_CDN =
  "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";

/** Prefer local weights in dev; production uses CDN (Vercel may fail on extensionless shards). */
export function getFaceApiWeightsUris(): string[] {
  const custom = process.env.NEXT_PUBLIC_FACE_API_WEIGHTS_URI?.trim();
  if (custom) return [custom];

  if (process.env.NODE_ENV === "development") {
    return ["/models", FACE_API_WEIGHTS_CDN];
  }

  return [FACE_API_WEIGHTS_CDN, "/models"];
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
