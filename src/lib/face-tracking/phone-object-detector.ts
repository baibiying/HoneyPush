"use client";

import type { PhoneWorkerRequest, PhoneWorkerResponse } from "./phone-detector.worker";

export type PhoneFrameScan = {
  hasPhone: boolean;
  bestPhoneScore: number;
};

let worker: Worker | null = null;
let workerReady = false;
let loadPromise: Promise<boolean> | null = null;
let loadError: string | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./phone-detector.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onerror = (e) => {
      loadError = e.message || "手机检测 worker 崩溃";
      workerReady = false;
    };
  }
  return worker;
}

export function getPhoneDetectorLoadError() {
  return loadError;
}

export async function loadPhoneObjectDetector(): Promise<boolean> {
  if (workerReady) return true;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const w = getWorker();
      await new Promise<void>((resolve, reject) => {
        const handler = (event: MessageEvent<PhoneWorkerResponse>) => {
          const msg = event.data;
          if (msg.type === "ready") {
            w.removeEventListener("message", handler);
            resolve();
          } else if (msg.type === "error") {
            w.removeEventListener("message", handler);
            reject(new Error(msg.message));
          }
        };
        w.addEventListener("message", handler);
        w.postMessage({ type: "init" } satisfies PhoneWorkerRequest);
      });
      workerReady = true;
      loadError = null;
      return true;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "模型加载失败";
      console.warn("[phone-object] 加载失败", e);
      workerReady = false;
      return false;
    }
  })();

  return loadPromise;
}

function detectWithWorker(bitmap: ImageBitmap): Promise<PhoneFrameScan> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const timeout = window.setTimeout(() => {
      w.removeEventListener("message", onMessage);
      bitmap.close();
      reject(new Error("手机检测超时"));
    }, 12_000);

    const onMessage = (event: MessageEvent<PhoneWorkerResponse>) => {
      const msg = event.data;
      if (msg.type === "result") {
        window.clearTimeout(timeout);
        w.removeEventListener("message", onMessage);
        resolve({ hasPhone: msg.hasPhone, bestPhoneScore: msg.bestPhoneScore });
      } else if (msg.type === "error") {
        window.clearTimeout(timeout);
        w.removeEventListener("message", onMessage);
        reject(new Error(msg.message));
      }
    };
    w.addEventListener("message", onMessage);
    w.postMessage({ type: "detect", bitmap } satisfies PhoneWorkerRequest, [bitmap]);
  });
}

/** 摄像头画面内出现手机即命中 */
export async function scanPhoneInFrame(
  video: HTMLVideoElement
): Promise<PhoneFrameScan> {
  if (!workerReady) {
    return { hasPhone: false, bestPhoneScore: 0 };
  }

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw <= 0 || vh <= 0) {
    return { hasPhone: false, bestPhoneScore: 0 };
  }

  try {
    const bitmap = await createImageBitmap(video);
    return await detectWithWorker(bitmap);
  } catch (e) {
    console.warn("[phone-object] 检测失败", e);
    return { hasPhone: false, bestPhoneScore: 0 };
  }
}

export function disposePhoneObjectDetector() {
  worker?.terminate();
  worker = null;
  workerReady = false;
  loadPromise = null;
  loadError = null;
}
