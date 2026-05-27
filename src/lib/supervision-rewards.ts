import { SUPERVISION_MAX_STRIKES } from "@/lib/supervision-blocks";
import type { DistractionStrikeRecord } from "@/lib/supervision-outcome";

/** 某段专注剩余星数（0～SUPERVISION_MAX_STRIKES） */
export function starsRemainingForBlock(
  blockNumber: number,
  distractions: DistractionStrikeRecord[]
): number {
  const strikes = distractions.filter((d) => d.blockNumber === blockNumber).length;
  return Math.max(0, SUPERVISION_MAX_STRIKES - strikes);
}

export function computeSupervisionStarStats(params: {
  totalBlocks: number;
  currentBlockNumber: number;
  distractions: DistractionStrikeRecord[];
}) {
  let starsCumulative = 0;
  for (let block = 1; block <= params.currentBlockNumber; block += 1) {
    starsCumulative += starsRemainingForBlock(block, params.distractions);
  }

  return {
    starsInBlock: starsRemainingForBlock(params.currentBlockNumber, params.distractions),
    /** 第 1 段至当前段累计获得的星星（每段最多 3 颗，按未扣掉的数量累计） */
    starsEarnedCumulative: starsCumulative,
  };
}

/** 任务成功：各段获得星星之和 = 本次专注币 */
export function computeFocusCoinsEarned(
  totalBlocks: number,
  distractions: DistractionStrikeRecord[]
): number {
  return computeSupervisionStarStats({
    totalBlocks,
    currentBlockNumber: totalBlocks,
    distractions,
  }).starsEarnedCumulative;
}
