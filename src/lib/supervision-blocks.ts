import {
  expandScheduledTaskToFocusSegments,
  POMODORO_BREAK_MINUTES,
  POMODORO_FOCUS_MINUTES,
  planPomodoroSegments,
  type TaskFocusSegment,
} from "@/lib/ai/schedule-times";

/** 尤里监督：每段专注最多 3 颗星，扣完即本 block 失败 */
export const SUPERVISION_MAX_STRIKES = 3;

/** 监督专注单段时长（分钟），与番茄钟排期一致 */
export const SUPERVISION_FOCUS_BLOCK_MINUTES = POMODORO_FOCUS_MINUTES;

/** 监督段间休息时长（秒），与番茄钟排期一致 */
export const SUPERVISION_BREAK_SECONDS = POMODORO_BREAK_MINUTES * 60;

export type SupervisionFocusBlock = {
  blockIndex: number;
  startAt: string;
  endAt: string;
};

export type SupervisionBlockTaskInput = {
  id: number;
  durationMinutes: number;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  scheduledFocusSegments?: unknown;
};

export function resolveSupervisionFocusBlocks(
  task: SupervisionBlockTaskInput,
  now = new Date()
): SupervisionFocusBlock[] {
  const segments = expandScheduledTaskToFocusSegments({
    id: task.id,
    durationMinutes: task.durationMinutes,
    scheduledStartAt: task.scheduledStartAt ?? null,
    scheduledEndAt: task.scheduledEndAt ?? null,
    scheduledFocusSegments: task.scheduledFocusSegments,
  });

  if (segments.length > 0) {
    return withSupervisionFocusDuration(segments.map(segmentToBlock));
  }

  return buildSyntheticFocusBlocks(task.durationMinutes, now);
}

/** 将每段专注压缩为测试时长，并重排后续段的开始时间 */
function withSupervisionFocusDuration(
  blocks: SupervisionFocusBlock[]
): SupervisionFocusBlock[] {
  if (blocks.length === 0) return blocks;

  const focusMs = Math.max(1, SUPERVISION_FOCUS_BLOCK_MINUTES) * 60 * 1000;
  const breakMs = Math.max(0, SUPERVISION_BREAK_SECONDS) * 1000;

  let cursor = new Date(blocks[0].startAt).getTime();
  if (Number.isNaN(cursor)) cursor = Date.now();

  return blocks.map((block, index) => {
    const startAt = new Date(cursor).toISOString();
    cursor += focusMs;
    const endAt = new Date(cursor).toISOString();
    if (index < blocks.length - 1) cursor += breakMs;

    return {
      ...block,
      startAt,
      endAt,
    };
  });
}

function segmentToBlock(segment: TaskFocusSegment): SupervisionFocusBlock {
  return {
    blockIndex: segment.segmentIndex,
    startAt: segment.startAt,
    endAt: segment.endAt,
  };
}

/** 未排期任务：按番茄钟拆成多个 25 分钟专注 block（段间休息仅体现在时间轴，不强制离场） */
function buildSyntheticFocusBlocks(
  durationMinutes: number,
  now: Date
): SupervisionFocusBlock[] {
  const blocks: SupervisionFocusBlock[] = [];
  let cursor = now.getTime();
  let blockIndex = 0;

  for (const segment of planPomodoroSegments(durationMinutes)) {
    if (segment.kind === "break") {
      cursor += segment.minutes * 60 * 1000;
      continue;
    }
    const startAt = new Date(cursor).toISOString();
    cursor += segment.minutes * 60 * 1000;
    blocks.push({
      blockIndex,
      startAt,
      endAt: new Date(cursor).toISOString(),
    });
    blockIndex += 1;
  }

  if (blocks.length > 0) {
    return withSupervisionFocusDuration(blocks);
  }

  const mins = Math.max(
    1,
    Math.min(SUPERVISION_FOCUS_BLOCK_MINUTES, Math.round(durationMinutes))
  );
  const end = now.getTime() + mins * 60 * 1000;
  return withSupervisionFocusDuration([
    {
      blockIndex: 0,
      startAt: now.toISOString(),
      endAt: new Date(end).toISOString(),
    },
  ]);
}

export function getBlockSecondsRemaining(
  block: SupervisionFocusBlock,
  now = new Date()
): number {
  const endMs = new Date(block.endAt).getTime();
  const diffSec = Math.ceil((endMs - now.getTime()) / 1000);
  return Math.max(0, diffSec);
}

export function isBlockEndReached(block: SupervisionFocusBlock, now = new Date()) {
  return getBlockSecondsRemaining(block, now) <= 0;
}

/** block 失败：手动关摄像头，或三颗星扣完 */
export function isSupervisionBlockFailed(params: {
  distractionCount: number;
  cameraClosedByUser: boolean;
}) {
  return params.cameraClosedByUser || params.distractionCount >= SUPERVISION_MAX_STRIKES;
}

/** block 成功：到结束时刻且未失败 */
export function isSupervisionBlockSucceeded(params: {
  distractionCount: number;
  cameraClosedByUser: boolean;
  block: SupervisionFocusBlock;
  now?: Date;
}) {
  if (isSupervisionBlockFailed(params)) return false;
  return isBlockEndReached(params.block, params.now);
}

export function formatBlockLabel(blockIndex: number, totalBlocks: number) {
  return `第 ${blockIndex + 1}/${totalBlocks} 段专注`;
}

/** 距离下一段专注开始还剩多少秒（含排期里的 5 分钟休息） */
export function getSecondsUntilBlockStart(
  block: SupervisionFocusBlock,
  now = new Date()
): number {
  const startMs = new Date(block.startAt).getTime();
  return Math.max(0, Math.ceil((startMs - now.getTime()) / 1000));
}

export function formatCountdownSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatBlockStartTime(startAt: string): string {
  const date = new Date(startAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
