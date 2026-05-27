import {
  buildAvailabilityWindows,
  type AvailabilitySlotInput,
  type AvailabilityWindow,
} from "./availability";
import { compareTasksForSchedule } from "./schedule-priority";
import { localDateTimeToUtc } from "./timezone";

/** 番茄钟：专注时长 + 段间休息（与 PRODUCT.md 一致） */
export const POMODORO_FOCUS_MINUTES = 25;
export const POMODORO_BREAK_MINUTES = 5;

/** AI 排期页面向用户展示的番茄钟说明 */
export const SCHEDULE_POMODORO_HINT = `排期按番茄钟拆分：每段专注 ${POMODORO_FOCUS_MINUTES} 分钟，段间休息 ${POMODORO_BREAK_MINUTES} 分钟（休息不显示在日历色块中）。`;
/** 不同任务之间的最短间隔 */
export const TASK_GAP_MINUTES = 10;

const STEP_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

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

export type ScheduledFocusSegment = {
  startAt: string;
  endAt: string;
};

export type TimedScheduleItem = {
  id: number;
  category: string;
  durationMinutes: number;
  order: number;
  scheduledStartAt: string;
  scheduledEndAt: string;
  focusSegments: ScheduledFocusSegment[];
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

function getLocalDayStartMs(instant: Date, timezoneOffsetMinutes?: number): number {
  if (timezoneOffsetMinutes === undefined) {
    const day = new Date(instant);
    day.setHours(0, 0, 0, 0);
    return day.getTime();
  }

  const shiftedMs = instant.getTime() - timezoneOffsetMinutes * 60 * 1000;
  const shifted = new Date(shiftedMs);
  return localDateTimeToUtc(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
    0,
    0,
    timezoneOffsetMinutes
  ).getTime();
}

function clipWindowsToLocalDay(
  windows: AvailabilityWindow[],
  dayStartMs: number
): AvailabilityWindow[] {
  const dayEndMs = dayStartMs + DAY_MS;
  const clipped: AvailabilityWindow[] = [];

  for (const window of windows) {
    const startMs = Math.max(window.start.getTime(), dayStartMs);
    const endMs = Math.min(window.end.getTime(), dayEndMs);
    if (endMs > startMs) {
      clipped.push({ start: new Date(startMs), end: new Date(endMs) });
    }
  }

  return clipped;
}

/** 从可用时段中提取不重复的本地日期（升序） */
function collectLocalDayStarts(
  windows: AvailabilityWindow[],
  timezoneOffsetMinutes?: number
): number[] {
  const days = new Set<number>();
  for (const window of windows) {
    days.add(getLocalDayStartMs(window.start, timezoneOffsetMinutes));
  }
  return [...days].sort((a, b) => a - b);
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
  scheduleStartAfter: Date,
  timezoneOffsetMinutes?: number
): { placed: TimedScheduleItem | null; notBefore: Date } {
  const segments = planPomodoroSegments(item.durationMinutes);

  /** restrictDayStart 为 null 时允许跨天；否则整任务必须落在该本地日 */
  const attempt = (
    restrictDayStart: number | null
  ): { placed: TimedScheduleItem | null; notBefore: Date; addedRanges: TimeRangeMs[] } => {
    const dayWindows =
      restrictDayStart === null
        ? windows
        : clipWindowsToLocalDay(windows, restrictDayStart);

    if (dayWindows.length === 0) {
      return { placed: null, notBefore: scheduleStartAfter, addedRanges: [] };
    }

    const trialOccupied = [...occupied];
    let firstFocusStart: Date | null = null;
    let lastFocusEnd: Date | null = null;
    const focusSegments: ScheduledFocusSegment[] = [];

    let notBefore = scheduleStartAfter;
    if (restrictDayStart !== null) {
      const dayEndMs = restrictDayStart + DAY_MS;
      if (notBefore.getTime() >= dayEndMs) {
        return { placed: null, notBefore: scheduleStartAfter, addedRanges: [] };
      }
      const earliestOnDay = dayWindows[0].start.getTime();
      notBefore = new Date(
        Math.max(notBefore.getTime(), restrictDayStart, earliestOnDay)
      );
    }

    for (const segment of segments) {
      if (segment.kind === "break") {
        const afterBreak = advanceNotBefore(dayWindows, notBefore, segment.minutes);
        if (!afterBreak) return { placed: null, notBefore: scheduleStartAfter, addedRanges: [] };
        notBefore = afterBreak;
        continue;
      }

      const durationMs = segment.minutes * 60 * 1000;
      const slot = findEarliestFocusSlot(
        dayWindows,
        durationMs,
        notBefore,
        trialOccupied,
        deadline
      );
      if (!slot) return { placed: null, notBefore: scheduleStartAfter, addedRanges: [] };

      if (!firstFocusStart) firstFocusStart = slot.start;
      lastFocusEnd = slot.end;
      focusSegments.push({
        startAt: slot.start.toISOString(),
        endAt: slot.end.toISOString(),
      });

      trialOccupied.push({ start: slot.start.getTime(), end: slot.end.getTime() });
      notBefore = slot.end;
    }

    if (!firstFocusStart || !lastFocusEnd) {
      return { placed: null, notBefore: scheduleStartAfter, addedRanges: [] };
    }

    return {
      placed: {
        ...item,
        scheduledStartAt: firstFocusStart.toISOString(),
        scheduledEndAt: lastFocusEnd.toISOString(),
        focusSegments,
      },
      notBefore,
      addedRanges: trialOccupied.slice(occupied.length),
    };
  };

  const candidateDays = collectLocalDayStarts(windows, timezoneOffsetMinutes).filter(
    (dayStart) => dayStart + DAY_MS > scheduleStartAfter.getTime()
  );

  for (const dayStart of candidateDays) {
    const onDay = attempt(dayStart);
    if (onDay.placed) {
      occupied.push(...onDay.addedRanges);
      return { placed: onDay.placed, notBefore: onDay.notBefore };
    }
  }

  const crossDay = attempt(null);
  if (crossDay.placed) {
    occupied.push(...crossDay.addedRanges);
    return { placed: crossDay.placed, notBefore: crossDay.notBefore };
  }

  return { placed: null, notBefore: scheduleStartAfter };
}

function parseStoredFocusSegments(
  raw: unknown
): ScheduledFocusSegment[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const parsed: ScheduledFocusSegment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as { startAt?: unknown; endAt?: unknown };
    const startAt = String(row.startAt ?? "");
    const endAt = String(row.endAt ?? "");
    if (!startAt || !endAt) continue;
    if (Number.isNaN(new Date(startAt).getTime())) continue;
    if (Number.isNaN(new Date(endAt).getTime())) continue;
    parsed.push({ startAt, endAt });
  }
  return parsed.length > 0 ? parsed : null;
}

export function expandScheduledTaskToFocusSegments(task: {
  id: number;
  scheduledStartAt: string | null;
  scheduledEndAt?: string | null;
  durationMinutes: number;
  scheduledFocusSegments?: unknown;
}): TaskFocusSegment[] {
  const stored = parseStoredFocusSegments(task.scheduledFocusSegments);
  if (stored) {
    return stored.map((segment, segmentIndex) => ({
      taskId: task.id,
      segmentIndex,
      startAt: segment.startAt,
      endAt: segment.endAt,
    }));
  }

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
  timezoneOffsetMinutes?: number,
  now = new Date()
): AssignScheduleResult {
  const windows = buildAvailabilityWindows(
    availabilitySlots,
    now,
    timezoneOffsetMinutes
  );
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
      scheduleStartAfter,
      timezoneOffsetMinutes
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
