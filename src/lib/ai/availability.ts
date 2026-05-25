export type AvailabilitySlotInput = {
  date: string;
  startTime: string;
  endTime: string;
};

export type AvailabilityWindow = {
  start: Date;
  end: Date;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseLocalDateTime(date: string, time: string): Date | null {
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

  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function roundUpToQuarterHour(date: Date) {
  const next = new Date(date);
  const minutes = next.getMinutes();
  const rounded = Math.ceil(minutes / 15) * 15;
  next.setSeconds(0, 0);
  if (rounded === 60) {
    next.setHours(next.getHours() + 1, 0, 0, 0);
  } else {
    next.setMinutes(rounded, 0, 0);
  }
  return next;
}

export function buildAvailabilityWindows(
  slots: AvailabilitySlotInput[],
  now = new Date()
): AvailabilityWindow[] {
  const windows: AvailabilityWindow[] = [];

  for (const slot of slots) {
    const start = parseLocalDateTime(slot.date, slot.startTime);
    const end = parseLocalDateTime(slot.date, slot.endTime);
    if (!start || !end || end.getTime() <= start.getTime()) continue;

    let effectiveStart = start;
    if (effectiveStart < now) {
      effectiveStart = roundUpToQuarterHour(now);
    }
    if (effectiveStart >= end) continue;

    windows.push({ start: effectiveStart, end });
  }

  return windows.sort((a, b) => a.start.getTime() - b.start.getTime());
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

export function parseAvailabilityFromBody(body: unknown): AvailabilitySlotInput[] | null {
  if (!Array.isArray(body)) return null;

  const slots: AvailabilitySlotInput[] = [];
  for (const item of body) {
    if (!item || typeof item !== "object") continue;
    const row = item as { date?: unknown; startTime?: unknown; endTime?: unknown };
    const date = String(row.date ?? "").trim();
    const startTime = String(row.startTime ?? "").trim();
    const endTime = String(row.endTime ?? "").trim();
    if (!date || !startTime || !endTime) continue;
    if (!parseLocalDateTime(date, startTime) || !parseLocalDateTime(date, endTime)) continue;
    slots.push({ date, startTime, endTime });
  }

  return slots.length > 0 ? slots : null;
}
