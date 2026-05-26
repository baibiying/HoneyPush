import { FACE_MATCH_GRAY_MAX, FACE_MATCH_THRESHOLD } from "./config";

export function averageDescriptors(descriptors: Float32Array[]): Float32Array | null {
  if (descriptors.length === 0) return null;
  const len = descriptors[0].length;
  const out = new Float32Array(len);
  for (const d of descriptors) {
    for (let i = 0; i < len; i++) out[i] += d[i];
  }
  for (let i = 0; i < len; i++) out[i] /= descriptors.length;
  return out;
}

export function faceDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export type FaceMatchResult = {
  distance: number;
  isUser: boolean;
  isGray: boolean;
  isStranger: boolean;
};

export function matchUserDescriptor(
  descriptor: Float32Array,
  userDescriptor: Float32Array
): FaceMatchResult {
  const distance = faceDistance(descriptor, userDescriptor);
  const isUser = distance <= FACE_MATCH_THRESHOLD;
  const isGray = distance > FACE_MATCH_THRESHOLD && distance <= FACE_MATCH_GRAY_MAX;
  const isStranger = distance > FACE_MATCH_GRAY_MAX;
  return { distance, isUser, isGray, isStranger };
}

export function isFaceBoxCentered(
  box: { x: number; y: number; width: number; height: number },
  videoWidth: number,
  videoHeight: number
): boolean {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const maxDx = videoWidth * 0.28;
  const maxDy = videoHeight * 0.32;
  return (
    Math.abs(cx - videoWidth / 2) <= maxDx && Math.abs(cy - videoHeight / 2) <= maxDy
  );
}

export function faceAreaRatio(
  box: { width: number; height: number },
  videoWidth: number,
  videoHeight: number
): number {
  return (box.width * box.height) / (videoWidth * videoHeight);
}
