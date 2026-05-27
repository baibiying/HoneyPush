import {
  evaluateSupervisionPose,
  type EnrollmentPoseIssue,
  type EnrollmentPoseResult,
} from "./enrollment-pose";
import { matchUserDescriptor } from "./descriptor";

type FaceBox = { x: number; y: number; width: number; height: number };

/**
 * 监督中：只根据「登记用户」脸框判断构图（画面中其他人脸忽略）。
 */
export function resolveSupervisionFraming(
  userFaceBox: FaceBox | null,
  videoWidth: number,
  videoHeight: number
): EnrollmentPoseResult {
  if (!userFaceBox) {
    return evaluateSupervisionPose([], videoWidth, videoHeight);
  }
  return evaluateSupervisionPose([userFaceBox], videoWidth, videoHeight);
}

/** 监督阶段摸鱼：构图丢失、画面中出现手机 */

type FaceWithDescriptor = {
  detection: { box: { x: number; y: number; width: number; height: number } };
  descriptor: Float32Array;
};

/** 监督帧：优先本人；仅一张脸且为灰区时仍视为本人，减少光照抖动误报 */
export function pickSupervisionFace(
  faces: FaceWithDescriptor[],
  userDescriptor: Float32Array
): { face: FaceWithDescriptor | null; userMatched: boolean } {
  let bestUser: FaceWithDescriptor | null = null;
  let bestUserDistance = Infinity;
  let bestGray: FaceWithDescriptor | null = null;
  let bestGrayDistance = Infinity;

  for (const face of faces) {
    const match = matchUserDescriptor(face.descriptor, userDescriptor);
    if (match.isUser && match.distance < bestUserDistance) {
      bestUserDistance = match.distance;
      bestUser = face;
    } else if (match.isGray && match.distance < bestGrayDistance) {
      bestGrayDistance = match.distance;
      bestGray = face;
    }
  }

  if (bestUser) return { face: bestUser, userMatched: true };
  if (faces.length === 1 && bestGray) return { face: bestGray, userMatched: true };
  if (faces.length === 1) return { face: faces[0], userMatched: false };
  return { face: null, userMatched: false };
}

export function framingDistractionReason(issue: EnrollmentPoseIssue): string {
  switch (issue) {
    case "no-face":
      return "镜头已拍不到你的脸部、双手与桌面，请回到座位并调整摄像头";
    case "multiple-faces":
      return "镜头已拍不到你的脸部、双手与桌面，请回到座位并调整摄像头";
    case "too-far":
      return "你离镜头太远，画面无法同时包含脸部、双手与桌面";
    case "too-close":
      return "你离镜头太近，画面无法同时包含脸部、双手与桌面";
    case "face-too-low":
    case "face-too-high":
    case "off-center":
      return "请调整摄像头，使画面能同时拍到你的脸部、双手与桌面";
    case "hands-missing":
      return "镜头已拍不到你的双手，请将双手放回桌面并保持在画面中";
    default:
      return "镜头构图不符合要求，请调整以同时拍到脸部、双手与桌面";
  }
}

/** @deprecated 请用 phone-use-detector 的 phoneUseDistractionReason */
export const PHONE_DISTRACTION_REASON =
  "检测到玩手机，请放下手机回到任务";
