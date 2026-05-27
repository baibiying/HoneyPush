import type { TaskFailureCause } from "@/lib/supervision-outcome";

export type MonitorTranslateFn = (
  path: string,
  params?: Record<string, string | number>
) => string;

export function getTaskFailureCauseDisplayLocalized(
  cause: TaskFailureCause,
  t: MonitorTranslateFn
): { headline: string; summary: string } {
  return {
    headline: t(`monitor.failureCause.${cause}.headline`),
    summary: t(`monitor.failureCause.${cause}.summary`),
  };
}

export function resolveTaskFailureCauseBilingual(reason: string): TaskFailureCause {
  const r = reason.toLowerCase();
  if (reason.includes("摄像头") || r.includes("camera")) return "camera-closed";
  if (
    reason.includes("三星") ||
    reason.includes("摸鱼") ||
    r.includes("strike") ||
    r.includes("slacking")
  ) {
    return "strikes-exhausted";
  }
  if (
    reason.includes("采集") ||
    reason.includes("人脸") ||
    r.includes("enrollment") ||
    r.includes("face")
  ) {
    return "enrollment-timeout";
  }
  if (reason.includes("取消") || r.includes("cancel")) return "cancelled";
  return "other";
}

/** 将 enrollment-pose 的 issue 或遗留 hint 转为文案 */
export function translatePoseHint(
  issue: string | undefined,
  fallbackHint: string,
  t: MonitorTranslateFn
): string {
  const keyByIssue: Record<string, string> = {
    "no-face": "monitor.pose.noFace",
    "multiple-faces": "monitor.pose.multipleFaces",
    "too-far": "monitor.pose.tooFar",
    "too-close": "monitor.pose.tooClose",
    "face-too-low": "monitor.pose.faceTooLow",
    "face-too-high": "monitor.pose.faceTooHigh",
    "off-center": "monitor.pose.offCenter",
    ok: "monitor.pose.collecting",
  };
  if (issue && keyByIssue[issue]) {
    if (issue === "no-face" && fallbackHint.includes("未就绪")) {
      return t("monitor.pose.videoNotReady");
    }
    return t(keyByIssue[issue]);
  }
  return translateDistractionOrHint(fallbackHint, t);
}

export function translateDistractionOrHint(text: string, t: MonitorTranslateFn): string {
  const exact: Record<string, string> = {
    一切正常: "monitor.status.allNormal",
    "已恢复劳动，继续专注": "monitor.status.laborRestored",
    "请保持脸部、双手与桌面在画面中": "monitor.status.keepFraming",
    "检测到玩手机，请放下手机回到任务": "monitor.distraction.phone",
    "检测到手机进入画面，请放下手机回到任务": "monitor.distraction.phoneEnter",
    "开场白结束，监督已开始": "monitor.enrollment.introDone",
    "请把摄像头摆在能拍到你脸部、双手与桌面的位置": "monitor.enrollment.cameraPlacement",
    "人脸采集成功，正在播放开场白…": "monitor.enrollment.successIntro",
    "人脸采集成功，监督已开始": "monitor.enrollment.successStarted",
    "姿势正确，请保持不动，正在采集…": "monitor.pose.collecting",
    "构图符合要求：脸部、双手与桌面均在画面中": "monitor.pose.supervisionOk",
  };
  if (exact[text]) return t(exact[text]);

  if (text.includes("姿势变化")) {
    const base = text.replace(/（姿势变化，请重新调整）/g, "").trim();
    const translated = exact[base] ? t(exact[base]) : base;
    return `${translated}${t("monitor.pose.poseChangedSuffix")}`;
  }

  const framingPrefixes = [
    { zh: "镜头已拍不到你的脸部、双手与桌面", key: "monitor.distraction.framingLost" },
    { zh: "你离镜头太远", key: "monitor.distraction.tooFar" },
    { zh: "你离镜头太近", key: "monitor.distraction.tooClose" },
    { zh: "请调整摄像头", key: "monitor.distraction.adjustCamera" },
    { zh: "镜头已拍不到你的双手", key: "monitor.distraction.handsLost" },
    { zh: "镜头构图不符合要求", key: "monitor.distraction.framingBad" },
  ];
  for (const { zh, key } of framingPrefixes) {
    if (text.startsWith(zh)) return t(key);
  }

  return text;
}

import { ENROLLMENT_TIMEOUT_SECONDS } from "@/lib/face-tracking/config";

export function formatEnrollmentTimeoutLabelLocalized(t: MonitorTranslateFn): string {
  const seconds = ENROLLMENT_TIMEOUT_SECONDS;
  if (seconds >= 60) {
    const minutes = Math.round(seconds / 60);
    return t("monitor.duration.minutes", { minutes });
  }
  return t("monitor.duration.seconds", { seconds });
}

export function formatBlockLabelLocalized(
  blockIndex: number,
  totalBlocks: number,
  t: MonitorTranslateFn
) {
  return t("monitor.blockLabel", { current: blockIndex + 1, total: totalBlocks });
}

export function formatBlockStartTimeLocalized(startAt: string, dateLocale: string) {
  const date = new Date(startAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatBreakDurationHintLocalized(
  totalSeconds: number,
  t: MonitorTranslateFn
): string {
  if (totalSeconds >= 60) {
    const minutes = Math.round(totalSeconds / 60);
    return t("monitor.duration.minutes", { minutes });
  }
  return t("monitor.duration.seconds", { seconds: totalSeconds });
}
