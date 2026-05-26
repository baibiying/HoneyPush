/** 摸鱼严重程度：1 轻 → 4 身份异常 */
export type DistractionLevel = 1 | 2 | 3 | 4;

export type DistractionEvent = {
  level: DistractionLevel;
  reason: string;
  /** L3 等：恢复专注前循环播放 */
  loopUntilRestore?: boolean;
};

export type EnrollmentPhase = "pending" | "enrolling" | "ready" | "failed";

export type TrackerDetectionStatus =
  | "idle"
  | "loading"
  | "enrolling"
  | "detecting"
  | "face-ok"
  | "framing-bad"
  | "phone";
