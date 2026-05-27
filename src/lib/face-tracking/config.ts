/** 欧氏距离 ≤ 此值视为本人 */
export const FACE_MATCH_THRESHOLD = 0.58;
/** 距离在此区间：不确定；单人镜头时可视为本人（减少光照变化误报） */
export const FACE_MATCH_GRAY_MAX = 0.68;

export const ENROLLMENT_TARGET_SAMPLES = 6;
/** @deprecated 采集构图见 enrollment-pose.ts */
export const ENROLLMENT_MIN_FACE_AREA_RATIO = 0.04;
export const ENROLLMENT_MAX_CENTER_OFFSET_RATIO = 0.28;
/** 姿势不对连续 N 帧则清空已采样本 */
export const ENROLLMENT_POSE_RESET_FRAMES = 3;

/** 自进入采集起超过该时长仍未成功 → 本段专注失败 */
export const ENROLLMENT_TIMEOUT_SECONDS = 3 * 60;
export const ENROLLMENT_TIMEOUT_MS = ENROLLMENT_TIMEOUT_SECONDS * 1000;
export const ENROLLMENT_TIMEOUT_MINUTES = ENROLLMENT_TIMEOUT_MS / 60_000;

export function formatEnrollmentTimeoutLabel(): string {
  if (ENROLLMENT_TIMEOUT_SECONDS >= 60) {
    const minutes = Math.round(ENROLLMENT_TIMEOUT_SECONDS / 60);
    return `${minutes} 分钟`;
  }
  return `${ENROLLMENT_TIMEOUT_SECONDS} 秒`;
}

export const TRIGGER_CONFIRM_FRAMES = 3;
/** 连续劳动帧数达到后视为恢复（尤里等监督：恢复后才能开始下一次摸鱼计数） */
export const RESTORE_CONFIRM_FRAMES = 2;
/** 连续多少帧未达劳动构图后才开始累计摸鱼时长 */
export const LABOR_LOST_CONFIRM_FRAMES = 5;

/** 摸鱼①：镜头无法同时拍到脸+手+桌（构图丢失） */
export const FRAMING_L1_SEC = 3;
export const FRAMING_L2_SEC = 5;
export const FRAMING_L3_SEC = 15;
export const FRAMING_L3_LONG_SEC = 30;

/** 摸鱼②：手机出现在画面内持续该时长后判定（去抖） */
export const PHONE_OBJECT_SEC = 1.2;
/** 传给 coco-ssd.detect 的 minScore（过低易把键盘/杯子误判为手机） */
export const PHONE_COCO_MIN_SCORE = 0.2;
/** 连续多少帧未检出才视为手机已离开画面 */
export const PHONE_MISS_RESET_FRAMES = 3;
export const PHONE_DETECT_MAX_BOXES = 20;

/** 脸下方工作区肤色占比绝对下限（无采集基线时） */
export const HANDS_MIN_SKIN_RATIO = 0.006;
/** 相对人脸采集时测得基线的比例，低于此视为双手离开画面 */
export const HANDS_BASELINE_FACTOR = 0.32;
