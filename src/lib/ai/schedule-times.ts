import {
  buildAvailabilityWindows,
  type AvailabilitySlotInput,
  type AvailabilityWindow,
} from "./availability";
import { compareTasksForSchedule } from "./schedule-priority";

/** 番茄钟：专注时长 + 段间休息（与 PRODUCT.md 一致） */
export const POMODORO_FOCUS_MINUTES = 25;
export const POMODORO_BREAK_MINUTES = 5;
/** 不同任务之间的最短间隔 */
export const TASK_GAP_MINUTES = 10;

const STEP_MS = 5 * 60 * 1000;

export type PomodoroSegment = { kind: "focus" | "break"; minutes: number };

type TimeRangeMs = { start: number; end: number };

/** 将预计专注时长拆成 25 分钟专注 + 5 分钟休息 的序列 */
export function planPomodoroSegments(focusMinutes: number): PomodoroSegment[] {
  const segments: PomodoroSegment[] = [];
  let remaining = Math.max(1, Math.round(focusMinutes));

  while (remaining > 0) {
    const focusLen = Math.min(POMODORO_FOCUS_MINUTES, remaining);
    segments.push({ kind: "focus", minutes: focusLen });
    remaining -= focusLen;
    if (remaining > 0) {
      segments.push({ kind: "break", minutes: POMODORO_BREAK_MINUTES });
    }
  }

  return segments;
}

/** 专注分钟数 → 在可用时段内实际占用的墙钟时间（含段间休息，仅用于容量估算） */
export function focusMinutesToWallClockMinutes(focusMinutes: number) {
  return planPomodoroSegments(focusMinutes).reduce((sum, segment) => sum + segment.minutes, 0);
}

export type TimedScheduleItem = {
  id: number;
  category: string;
  durationMinutes: number;
  order: number;
  scheduledStartAt: string;
  scheduledEndAt: string;
};

export type TaskFocusSegment = {
  taskId: number;
  segmentIndex: number;
  startAt: string;
  endAt: string;
};

function rangesOverlap(start: number, end: number, occupied: TimeRangeMs[]) {
  return occupied.some((slot) => start < slot.end && end > slot.start);
}

function advanceNotBefore(
  windows: AvailabilityWindow[],
  from: Date,
  minutes: number
): Date | null {
  let needMs = minutes * 60 * 1000;
  let pos = from.getTime();

  for (const window of windows) {
    if (window.end.getTime() <= pos) continue;

    const startInWindow = Math.max(pos, window.start.getTime());
    if (startInWindow >= window.end.getTime()) continue;

    const available = window.end.getTime() - startInWindow;
    const take = Math.min(needMs, available);
    pos = startInWindow + take;
    needMs -= take;

    if (needMs <= 0) return new Date(pos);
  }

  return null;
}

/** 在可用时段内找最早的不与已排专注段重叠的空档 */
function findEarliestFocusSlot(
  windows: AvailabilityWindow[],
  durationMs: number,
  notBefore: Date,
  occupied: TimeRangeMs[],
  deadline: Date | null
): { start: Date; end: Date } | null {
  const notBeforeMs = notBefore.getTime();

  for (const window of windows) {
    let candidate = Math.max(window.start.getTime(), notBeforeMs);

    while (candidate + durationMs <= window.end.getTime()) {
      const end = candidate + durationMs;

      if (!rangesOverlap(candidate, end, occupied)) {
        if (deadline && end > deadline.getTime()) {
          const altStart = deadline.getTime() - durationMs;
          if (
            altStart >= Math.max(window.start.getTime(), notBeforeMs) &&
            altStart + durationMs <= window.end.getTime() &&
            !rangesOverlap(altStart, altStart + durationMs, occupied)
          ) {
            return { start: new Date(altStart), end: new Date(altStart + durationMs) };
          }
          candidate += STEP_MS;
          continue;
        }

        return { start: new Date(candidate), end: new Date(end) };
      }

      const blocker = occupied.find((slot) => candidate < slot.end && end > slot.start);
      candidate = blocker ? blocker.end : candidate + STEP_MS;
    }
  }

  return null;
}

function placeTaskWithPomodoros(
  windows: AvailabilityWindow[],
  item: { id: number; category: string; durationMinutes: number; order: number },
  deadline: Date | null,
  occupied: TimeRangeMs[],
  scheduleStartAfter: Date
): { placed: TimedScheduleItem | null; notBefore: Date } {
  const segments = planPomodoroSegments(item.durationMinutes);
  let firstFocusStart: Date | null = null;
  let lastFocusEnd: Date | null = null;
  let notBefore = scheduleStartAfter;

  for (const segment of segments) {
    if (segment.kind === "break") {
      const afterBreak = advanceNotBefore(windows, notBefore, segment.minutes);
      if (!afterBreak) return { placed: null, notBefore };
      notBefore = afterBreak;
      continue;
    }

    const durationMs = segment.minutes * 60 * 1000;
    const slot = findEarliestFocusSlot(windows, durationMs, notBefore, occupied, deadline);
    if (!slot) return { placed: null, notBefore };

    if (!firstFocusStart) firstFocusStart = slot.start;
    lastFocusEnd = slot.end;

    occupied.push({ start: slot.start.getTime(), end: slot.end.getTime() });
    notBefore = slot.end;
  }

  if (!firstFocusStart || !lastFocusEnd) {
    return { placed: null, notBefore };
  }

  return {
    placed: {
      ...item,
      scheduledStartAt: firstFocusStart.toISOString(),
      scheduledEndAt: lastFocusEnd.toISOString(),
    },
    notBefore,
  };
}

export function expandScheduledTaskToFocusSegments(task: {
  id: number;
  scheduledStartAt: string | null;
  durationMinutes: number;
}): TaskFocusSegment[] {
  if (!task.scheduledStartAt) return [];

  const segments = planPomodoroSegments(task.durationMinutes);
  let cursor = new Date(task.scheduledStartAt);
  const result: TaskFocusSegment[] = [];
  let index = 0;

  for (const segment of segments) {
    if (segment.kind === "break") {
      cursor = new Date(cursor.getTime() + segment.minutes * 60 * 1000);
      continue;
    }

    const start = new Date(cursor);
    const end = new Date(cursor.getTime() + segment.minutes * 60 * 1000);
    result.push({
      taskId: task.id,
      segmentIndex: index,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    });
    cursor = end;
    index += 1;
  }

  return result;
}

export type AssignScheduleResult = {
  schedule: TimedScheduleItem[];
  unscheduledIds: number[];
};

export function assignScheduleTimes(
  items: Array<{
    id: number;
    category: string;
    durationMinutes: number;
    order: number;
  }>,
  deadlinesById: Map<number, Date | null>,
  availabilitySlots: AvailabilitySlotInput[],
  now = new Date()
): AssignScheduleResult {
  const windows = buildAvailabilityWindows(availabilitySlots, now);
  const sorted = [...items].sort((a, b) => compareTasksForSchedule(a, b, deadlinesById));

  if (windows.length === 0) {
    return { schedule: [], unscheduledIds: sorted.map((item) => item.id) };
  }

  const occupied: TimeRangeMs[] = [];
  const result: TimedScheduleItem[] = [];
  const unscheduledIds: number[] = [];
  let scheduleStartAfter = windows[0].start;

  for (const item of sorted) {
    const deadline = deadlinesById.get(item.id) ?? null;
    const { placed, notBefore } = placeTaskWithPomodoros(
      windows,
      item,
      deadline,
      occupied,
      scheduleStartAfter
    );

    if (!placed) {
      unscheduledIds.push(item.id);
      continue;
    }

    result.push(placed);

    const gapStartMs = notBefore.getTime();
    const gapEndMs = gapStartMs + TASK_GAP_MINUTES * 60 * 1000;
    occupied.push({ start: gapStartMs, end: gapEndMs });

    const afterGap = advanceNotBefore(windows, notBefore, TASK_GAP_MINUTES);
    scheduleStartAfter = afterGap ?? new Date(gapEndMs);
  }

  return { schedule: result, unscheduledIds };
}
