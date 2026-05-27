import { computeSupervisionStarStats } from "@/lib/supervision-rewards";

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
  /** 本段剩余星 */
  starsRemaining: number;
  /** 第 1 段至当前段累计获得的星星数 */
  starsEarnedCumulative: number;
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

export { resolveTaskFailureCauseBilingual as resolveTaskFailureCause } from "@/lib/monitor-i18n";

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
  const { starsInBlock, starsEarnedCumulative } = computeSupervisionStarStats({
    totalBlocks: params.totalBlocks,
    currentBlockNumber: params.currentBlockNumber,
    distractions: params.distractions,
  });

  return {
    taskText: params.taskText,
    officerName: params.officerName,
    totalBlocks: params.totalBlocks,
    completedBlocks: params.completedBlocks,
    currentBlockNumber: params.currentBlockNumber,
    distractionsInBlock: strikesInCurrentBlock,
    distractionsCumulative,
    totalDistractions: params.totalDistractions,
    starsRemaining: starsInBlock,
    starsEarnedCumulative,
    distractions: params.distractions,
    coinsEarned: params.coinsEarned,
    totalCoins: params.totalCoins,
    totalSessions: params.totalSessions,
  };
}
