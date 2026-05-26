/** 欧氏距离 ≤ 此值视为本人 */
export const FACE_MATCH_THRESHOLD = 0.55;
/** 距离在此区间：不确定，不计入在场 */
export const FACE_MATCH_GRAY_MAX = 0.65;

export const ENROLLMENT_TARGET_SAMPLES = 6;
/** @deprecated 采集构图见 enrollment-pose.ts */
export const ENROLLMENT_MIN_FACE_AREA_RATIO = 0.04;
export const ENROLLMENT_MAX_CENTER_OFFSET_RATIO = 0.28;
/** 姿势不对连续 N 帧则清空已采样本 */
export const ENROLLMENT_POSE_RESET_FRAMES = 3;

/** 自进入采集起超过该时长仍未成功 → 任务执行失败 */
export const ENROLLMENT_TIMEOUT_MS = 3 * 60 * 1000;
export const ENROLLMENT_TIMEOUT_MINUTES = ENROLLMENT_TIMEOUT_MS / 60_000;

export const TRIGGER_CONFIRM_FRAMES = 3;
export const RESTORE_CONFIRM_FRAMES = 4;

/** 摸鱼①：镜头无法同时拍到脸+手+桌（构图丢失） */
export const FRAMING_L1_SEC = 2;
export const FRAMING_L2_SEC = 5;
export const FRAMING_L3_SEC = 15;
export const FRAMING_L3_LONG_SEC = 30;

/** 摸鱼②：手机出现在画面内持续该时长后判定（去抖） */
export const PHONE_OBJECT_SEC = 0.2;
/** 传给 coco-ssd.detect 的 minScore（默认 0.5 会漏掉大量手机） */
export const PHONE_COCO_MIN_SCORE = 0.12;
/** 连续多少帧未检出才视为手机已离开画面 */
export const PHONE_MISS_RESET_FRAMES = 3;
export const PHONE_DETECT_MAX_BOXES = 20;
