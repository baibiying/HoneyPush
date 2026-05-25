import {
  getClientTimezoneOffsetMinutes,
  localDateTimeToUtc,
  parseTimezoneOffsetMinutes,
  roundUpToQuarterHourInTimezone,
} from "@/lib/ai/timezone";

export type AvailabilitySlotInput = {
  date: string;
  startTime: string;
  endTime: string;
};

export { getClientTimezoneOffsetMinutes, parseTimezoneOffsetMinutes };

export type AvailabilityWindow = {
  start: Date;
  end: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * 将可用时段中的日期 + 时间解析为绝对时刻。
 * @param timezoneOffsetMinutes 客户端 `getTimezoneOffset()`；服务端排期时必须传入。
 */
export function parseLocalDateTime(
  date: string,
  time: string,
  timezoneOffsetMinutes?: number
): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  /** 24:00 表示当天结束（次日本地 0:00） */
  if (hour === 24 && minute === 0) {
    const dayStart = localDateTimeToUtc(year, month, day, 0, 0, timezoneOffsetMinutes);
    return new Date(dayStart.getTime() + DAY_MS);
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  const parsed = localDateTimeToUtc(
    year,
    month,
    day,
    hour,
    minute,
    timezoneOffsetMinutes
  );

  if (timezoneOffsetMinutes === undefined) {
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }
  }

  return parsed;
}

export function buildAvailabilityWindows(
  slots: AvailabilitySlotInput[],
  now = new Date(),
  timezoneOffsetMinutes?: number
): AvailabilityWindow[] {
  const windows: AvailabilityWindow[] = [];

  for (const slot of slots) {
    const start = parseLocalDateTime(slot.date, slot.startTime, timezoneOffsetMinutes);
    const end = parseLocalDateTime(slot.date, slot.endTime, timezoneOffsetMinutes);
    if (!start || !end || end.getTime() <= start.getTime()) continue;

    let effectiveStart = start;
    if (effectiveStart < now) {
      effectiveStart = roundUpToQuarterHourInTimezone(now, timezoneOffsetMinutes);
    }
    if (effectiveStart >= end) continue;

    windows.push({ start: effectiveStart, end });
  }

  return windows.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** 专注时段是否完全落在某一可用窗口内 */
export function isRangeWithinAvailabilityWindows(
  startMs: number,
  endMs: number,
  windows: AvailabilityWindow[]
) {
  if (endMs <= startMs) return false;
  return windows.some(
    (window) => startMs >= window.start.getTime() && endMs <= window.end.getTime()
  );
}

export function formatAvailabilitySlot(slot: AvailabilitySlotInput) {
  const start = parseLocalDateTime(slot.date, slot.startTime);
  const end = parseLocalDateTime(slot.date, slot.endTime);
  if (!start || !end) return `${slot.date} ${slot.startTime}-${slot.endTime}`;

  const dateLabel = start.toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
  const fmt = (value: Date) =>
    value.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${dateLabel} ${fmt(start)}–${fmt(end)}`;
}

export function parseAvailabilityFromBody(
  body: unknown,
  timezoneOffsetMinutes?: number
): AvailabilitySlotInput[] | null {
  if (!Array.isArray(body)) return null;

  const slots: AvailabilitySlotInput[] = [];
  for (const item of body) {
    if (!item || typeof item !== "object") continue;
    const row = item as { date?: unknown; startTime?: unknown; endTime?: unknown };
    const date = String(row.date ?? "").trim();
    const startTime = String(row.startTime ?? "").trim();
    const endTime = String(row.endTime ?? "").trim();
    if (!date || !startTime || !endTime) continue;
    if (
      !parseLocalDateTime(date, startTime, timezoneOffsetMinutes) ||
      !parseLocalDateTime(date, endTime, timezoneOffsetMinutes)
    ) {
      continue;
    }
    slots.push({ date, startTime, endTime });
  }

  return slots.length > 0 ? slots : null;
}
