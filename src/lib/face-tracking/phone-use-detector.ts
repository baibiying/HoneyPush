"use client";

import { PHONE_MISS_RESET_FRAMES, PHONE_OBJECT_SEC } from "./config";
import {
  getPhoneDetectorLoadError,
  loadPhoneObjectDetector,
  scanPhoneInFrame,
} from "./phone-object-detector";

export type PhoneUseSignal = {
  active: boolean;
  bestPhoneScore: number;
};

let objectReady = false;
let loadPromise: Promise<boolean> | null = null;

const objectSinceRef = { current: null as number | null };
const missFramesRef = { current: 0 };

export async function loadPhoneUseModels(): Promise<boolean> {
  if (objectReady) return true;
  if (loadPromise) return loadPromise;
  loadPromise = loadPhoneObjectDetector().then((ok) => {
    objectReady = ok;
    return ok;
  });
  return loadPromise;
}

export function getPhoneUseLoadError() {
  return getPhoneDetectorLoadError();
}

export function resetPhoneUseTimers() {
  objectSinceRef.current = null;
  missFramesRef.current = 0;
}

export function isPhoneUseModelsReady() {
  return objectReady;
}

/**
 * 玩手机：手机进入摄像头画面即摸鱼；离开画面即劳动。
 */
export async function evaluatePhoneUse(video: HTMLVideoElement): Promise<PhoneUseSignal> {
  if (!objectReady) {
    return { active: false, bestPhoneScore: 0 };
  }

  const now = Date.now();
  const scan = await scanPhoneInFrame(video);

  if (scan.hasPhone) {
    missFramesRef.current = 0;
    if (objectSinceRef.current == null) objectSinceRef.current = now;
  } else {
    missFramesRef.current += 1;
    if (missFramesRef.current >= PHONE_MISS_RESET_FRAMES) {
      objectSinceRef.current = null;
    }
  }

  const visibleSec =
    objectSinceRef.current != null ? (now - objectSinceRef.current) / 1000 : 0;

  return {
    active: visibleSec >= PHONE_OBJECT_SEC,
    bestPhoneScore: scan.bestPhoneScore,
  };
}

export function phoneUseDistractionReason(): string {
  return "检测到手机进入画面，请放下手机回到任务";
}

export function disposePhoneUseModels() {
  objectReady = false;
  loadPromise = null;
  resetPhoneUseTimers();
  void import("./phone-object-detector").then((m) => m.disposePhoneObjectDetector());
}
