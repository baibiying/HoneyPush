import {
  buildAvailabilityWindows,
  type AvailabilitySlotInput,
  type AvailabilityWindow,
} from "./availability";

/** 番茄钟：专注时长 + 段间休息（与 PRODUCT.md 一致） */
export const POMODORO_FOCUS_MINUTES = 25;
export const POMODORO_BREAK_MINUTES = 5;

/** 专注分钟数 → 日历占用时长（含段间 5 分钟休息） */
export function focusMinutesToWallClockMinutes(focusMinutes: number) {
  const pomodoros = Math.ceil(focusMinutes / POMODORO_FOCUS_MINUTES);
  const breaks = Math.max(0, pomodoros - 1) * POMODORO_BREAK_MINUTES;
  return focusMinutes + breaks;
}

export type TimedScheduleItem = {
  id: number;
  category: string;
  durationMinutes: number;
  order: number;
  scheduledStartAt: string;
  scheduledEndAt: string;
};

type MutableWindow = AvailabilityWindow & { cursor: Date };

function initMutableWindows(windows: AvailabilityWindow[]): MutableWindow[] {
  return windows.map((window) => ({
    ...window,
    cursor: new Date(window.start),
  }));
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
  const sorted = [...items].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    const deadlineA = deadlinesById.get(a.id)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const deadlineB = deadlinesById.get(b.id)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return deadlineA - deadlineB;
  });

  if (windows.length === 0) {
    return { schedule: [], unscheduledIds: sorted.map((item) => item.id) };
  }

  const mutableWindows = initMutableWindows(windows);
  const result: TimedScheduleItem[] = [];
  const unscheduledIds: number[] = [];
  const breakMs = POMODORO_BREAK_MINUTES * 60 * 1000;

  for (const item of sorted) {
    const wallClockMinutes = focusMinutesToWallClockMinutes(item.durationMinutes);
    const durationMs = wallClockMinutes * 60 * 1000;
    const deadline = deadlinesById.get(item.id) ?? null;

    let placed = false;

    for (const window of mutableWindows) {
      let start = new Date(window.cursor);
      if (start < window.start) start = new Date(window.start);

      if (start.getTime() + durationMs > window.end.getTime()) continue;

      let end = new Date(start.getTime() + durationMs);

      if (deadline && end.getTime() > deadline.getTime()) {
        const altStart = new Date(deadline.getTime() - durationMs);
        if (
          altStart.getTime() >= window.start.getTime() &&
          altStart.getTime() >= window.cursor.getTime() &&
          altStart.getTime() + durationMs <= window.end.getTime()
        ) {
          start = altStart;
          end = new Date(start.getTime() + durationMs);
        } else {
          continue;
        }
      }

      result.push({
        ...item,
        scheduledStartAt: start.toISOString(),
        scheduledEndAt: end.toISOString(),
      });

      window.cursor = new Date(end.getTime() + breakMs);
      placed = true;
      break;
    }

    if (!placed) {
      unscheduledIds.push(item.id);
    }
  }

  return { schedule: result, unscheduledIds };
}
