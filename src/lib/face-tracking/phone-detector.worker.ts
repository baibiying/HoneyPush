/// <reference lib="webworker" />

import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import { load as loadCocoSsd } from "@tensorflow-models/coco-ssd";
import {
  PHONE_COCO_MIN_SCORE,
  PHONE_DETECT_MAX_BOXES,
} from "./config";

const PHONE_CLASS = "cell phone";

type CocoModel = {
  detect: (
    input: HTMLCanvasElement | OffscreenCanvas,
    maxNumBoxes?: number,
    minScore?: number
  ) => Promise<Array<{ class: string; score: number }>>;
};

let model: CocoModel | null = null;

async function ensureModel() {
  if (model) return model;
  await tf.ready();
  if (!tf.getBackend()) {
    await tf.setBackend("webgl");
    await tf.ready();
  }
  model = (await loadCocoSsd({ base: "lite_mobilenet_v2" })) as CocoModel;
  return model;
}

function bitmapToCanvas(bitmap: ImageBitmap): OffscreenCanvas {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建 OffscreenCanvas");
  ctx.drawImage(bitmap, 0, 0);
  return canvas;
}

export type PhoneWorkerRequest =
  | { type: "init" }
  | { type: "detect"; bitmap: ImageBitmap };

export type PhoneWorkerResponse =
  | { type: "ready" }
  | { type: "error"; message: string }
  | { type: "result"; hasPhone: boolean; bestPhoneScore: number };

self.onmessage = async (event: MessageEvent<PhoneWorkerRequest>) => {
  const msg = event.data;
  try {
    if (msg.type === "init") {
      await ensureModel();
      const res: PhoneWorkerResponse = { type: "ready" };
      self.postMessage(res);
      return;
    }

    if (msg.type === "detect") {
      const detector = await ensureModel();
      const canvas = bitmapToCanvas(msg.bitmap);
      msg.bitmap.close();

      const predictions = await detector.detect(
        canvas,
        PHONE_DETECT_MAX_BOXES,
        PHONE_COCO_MIN_SCORE
      );

      let bestPhoneScore = 0;
      for (const p of predictions) {
        if (p.class !== PHONE_CLASS) continue;
        if (p.score > bestPhoneScore) bestPhoneScore = p.score;
      }

      const res: PhoneWorkerResponse = {
        type: "result",
        hasPhone: bestPhoneScore > 0,
        bestPhoneScore,
      };
      self.postMessage(res);
      return;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "手机检测 worker 异常";
    const res: PhoneWorkerResponse = { type: "error", message };
    self.postMessage(res);
  }
};
