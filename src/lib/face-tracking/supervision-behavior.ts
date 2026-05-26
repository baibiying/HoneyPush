import {
  evaluateEnrollmentPose,
  type EnrollmentPoseIssue,
  type EnrollmentPoseResult,
} from "./enrollment-pose";

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
    return evaluateEnrollmentPose([], videoWidth, videoHeight);
  }
  return evaluateEnrollmentPose([userFaceBox], videoWidth, videoHeight);
}

/** 监督阶段摸鱼：构图丢失、画面中出现手机 */

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
    default:
      return "镜头构图不符合要求，请调整以同时拍到脸部、双手与桌面";
  }
}

/** @deprecated 请用 phone-use-detector 的 phoneUseDistractionReason */
export const PHONE_DISTRACTION_REASON =
  "检测到玩手机，请放下手机回到任务";
