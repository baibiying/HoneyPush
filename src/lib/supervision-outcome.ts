import { SUPERVISION_MAX_STRIKES } from "@/lib/supervision-blocks";

/** 单次摸鱼记录（含所属任务段） */
export type DistractionStrikeRecord = {
  /** 本段内第几次摸鱼（1～3） */
  strikeIndexInBlock: number;
  /** 任务第几段专注（从 1 起） */
  blockNumber: number;
  reason: string;
};

export type SupervisionOutcomeStats = {
  taskText: string;
  officerName: string;
  totalBlocks: number;
  completedBlocks: number;
  /** 当前/最近一段是任务第几段（从 1 起） */
  currentBlockNumber: number;
  /** 本段摸鱼次数 */
  distractionsInBlock: number;
  /** 第 1 段至当前段累计摸鱼次数 */
  distractionsCumulative: number;
  totalDistractions: number;
  starsRemaining: number;
  /** 摸鱼明细（含原因与所属段） */
  distractions: DistractionStrikeRecord[];
  coinsEarned?: number;
  totalCoins?: number;
  totalSessions?: number;
};

export type SupervisionOutcomeModalState =
  | {
      kind: "block-success";
      stats: SupervisionOutcomeStats;
      breakSecondsUntilNext: number;
      nextBlockLabel: string;
      nextBlockStartLabel: string;
    }
  | {
      kind: "block-fail";
      stats: SupervisionOutcomeStats;
      failReason: string;
      recordSaved: boolean;
    }
  | {
      kind: "task-success";
      stats: SupervisionOutcomeStats;
      recordSaved: boolean;
    }
  | {
      kind: "task-fail";
      stats: SupervisionOutcomeStats;
      failReason: string;
      recordSaved: boolean;
    };

/** 任务失败原因分类（用于结算页展示） */
export type TaskFailureCause =
  | "strikes-exhausted"
  | "camera-closed"
  | "enrollment-timeout"
  | "cancelled"
  | "other";

export function resolveTaskFailureCause(reason: string): TaskFailureCause {
  if (reason.includes("摄像头")) return "camera-closed";
  if (reason.includes("三星") || reason.includes("摸鱼")) return "strikes-exhausted";
  if (reason.includes("采集") || reason.includes("人脸")) return "enrollment-timeout";
  if (reason.includes("取消")) return "cancelled";
  return "other";
}

export function getTaskFailureCauseDisplay(cause: TaskFailureCause): {
  headline: string;
  summary: string;
} {
  switch (cause) {
    case "camera-closed":
      return {
        headline: "手动关闭摄像头",
        summary: "监督期间摄像头被关闭，本段专注视为失败，整个任务终止。",
      };
    case "strikes-exhausted":
      return {
        headline: "摸鱼 · 三颗星扣完",
        summary: "监督期间摸鱼次数达到上限，尤里教官判定本段失败，整个任务终止。",
      };
    case "enrollment-timeout":
      return {
        headline: "人脸采集超时",
        summary: "规定时间内未完成人脸采集，无法进入监督，任务终止。",
      };
    case "cancelled":
      return {
        headline: "取消监督",
        summary: "监督流程已取消，任务未继续执行。",
      };
    default:
      return {
        headline: "未达成监督要求",
        summary: "未满足完成条件，任务终止。",
      };
  }
}

export function buildOutcomeStats(params: {
  taskText: string;
  officerName: string;
  totalBlocks: number;
  completedBlocks: number;
  currentBlockNumber: number;
  distractions: DistractionStrikeRecord[];
  totalDistractions: number;
  coinsEarned?: number;
  totalCoins?: number;
  totalSessions?: number;
}): SupervisionOutcomeStats {
  const strikesInCurrentBlock = params.distractions.filter(
    (d) => d.blockNumber === params.currentBlockNumber
  ).length;
  const distractionsCumulative = params.distractions.filter(
    (d) => d.blockNumber <= params.currentBlockNumber
  ).length;

  return {
    taskText: params.taskText,
    officerName: params.officerName,
    totalBlocks: params.totalBlocks,
    completedBlocks: params.completedBlocks,
    currentBlockNumber: params.currentBlockNumber,
    distractionsInBlock: strikesInCurrentBlock,
    distractionsCumulative,
    totalDistractions: params.totalDistractions,
    starsRemaining: Math.max(0, SUPERVISION_MAX_STRIKES - strikesInCurrentBlock),
    distractions: params.distractions,
    coinsEarned: params.coinsEarned,
    totalCoins: params.totalCoins,
    totalSessions: params.totalSessions,
  };
}
