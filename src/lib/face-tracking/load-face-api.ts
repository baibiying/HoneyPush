/** Load face-api.js + weights in the browser (monitor page only). */

export type FaceApiRuntime = typeof import("face-api.js");

export type FaceApiLoadResult = {
  faceapi: FaceApiRuntime;
  recognitionReady: boolean;
};

let cached: FaceApiLoadResult | null = null;
let inflight: Promise<FaceApiLoadResult> | null = null;

export function resetFaceApiCache() {
  cached = null;
  inflight = null;
}

export function getModelsBaseUri() {
  if (typeof window === "undefined") return "/models";
  return `${window.location.origin}/models`;
}

/** Local first; CDN fallback helps when Vercel static shards fail. */
export function getModelUriCandidates(): string[] {
  const custom = process.env.NEXT_PUBLIC_FACE_API_WEIGHTS_URI?.trim();
  const local = getModelsBaseUri();
  const cdn =
    "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";
  if (custom) return [custom, local, cdn];
  return [local, cdn];
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
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

async function verifyModelsReachable(baseUri: string) {
  const root = baseUri.replace(/\/$/, "");
  const url = `${root}/tiny_face_detector_model-weights_manifest.json`;
  try {
    const res = await fetch(url, { method: "GET", cache: "force-cache" });
    return res.ok;
  } catch {
    return false;
  }
}

export type FaceApiLoadStage =
  | "import"
  | "backend"
  | "detector"
  | "landmarks"
  | "recognition";

export async function loadFaceApiRuntime(
  onStage?: (stage: FaceApiLoadStage) => void
): Promise<FaceApiLoadResult> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    onStage?.("import");
    const faceapi = await withTimeout(
      import("face-api.js"),
      25_000,
      "face-api import timeout"
    );

    onStage?.("backend");
    await faceapi.tf.setBackend("cpu");
    await faceapi.tf.ready();

    let weightsUri: string | null = null;
    for (const uri of getModelUriCandidates()) {
      if (await verifyModelsReachable(uri)) {
        weightsUri = uri;
        console.info("[face-api] using weights from", uri);
        break;
      }
    }
    if (!weightsUri) {
      throw new Error("Face model files are not reachable");
    }

    const loadNet = async (
      net: { loadFromUri: (uri: string) => Promise<void> },
      stage: FaceApiLoadStage
    ) => {
      onStage?.(stage);
      await withTimeout(net.loadFromUri(weightsUri!), 90_000, `${stage} timeout`);
    };

    await loadNet(faceapi.nets.tinyFaceDetector, "detector");
    await loadNet(faceapi.nets.faceLandmark68Net, "landmarks");

    let recognitionReady = false;
    try {
      await loadNet(faceapi.nets.faceRecognitionNet, "recognition");
      recognitionReady = true;
    } catch (e) {
      console.warn("[face-api] recognition model skipped", e);
    }

    const result = { faceapi, recognitionReady };
    cached = result;
    return result;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
