/** `Date.getTimezoneOffset()`：UTC 与本地时间的差值（分钟），与浏览器一致 */
export function getClientTimezoneOffsetMinutes(): number {
  return new Date().getTimezoneOffset();
}

export function parseTimezoneOffsetMinutes(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < -840 || n > 840) return undefined;
  return Math.round(n);
}

/**
 * 将用户填写的本地日期+时间转为 UTC 时刻。
 * @param tzOffsetMinutes 客户端 `getTimezoneOffset()`（未传则按运行环境本地时区构造）
 */
export function localDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tzOffsetMinutes?: number
): Date {
  if (tzOffsetMinutes === undefined) {
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }
  return new Date(
    Date.UTC(year, month - 1, day, hour, minute, 0, 0) + tzOffsetMinutes * 60 * 1000
  );
}

/** 在本地时区将时刻向上取整到 15 分钟 */
export function roundUpToQuarterHourInTimezone(
  instant: Date,
  tzOffsetMinutes?: number
): Date {
  if (tzOffsetMinutes === undefined) {
    const next = new Date(instant);
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

  const shifted = new Date(instant.getTime() - tzOffsetMinutes * 60 * 1000);
  let year = shifted.getUTCFullYear();
  let month = shifted.getUTCMonth() + 1;
  let day = shifted.getUTCDate();
  let hour = shifted.getUTCHours();
  let minute = shifted.getUTCMinutes();

  const rounded = Math.ceil(minute / 15) * 15;
  if (rounded === 60) {
    hour += 1;
    minute = 0;
    if (hour === 24) {
      hour = 0;
      const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
      year = nextDay.getUTCFullYear();
      month = nextDay.getUTCMonth() + 1;
      day = nextDay.getUTCDate();
    }
  } else {
    minute = rounded;
  }

  return localDateTimeToUtc(year, month, day, hour, minute, tzOffsetMinutes);
}
