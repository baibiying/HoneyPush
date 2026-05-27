import type { TranslateParams } from "./translate";

/** 日期标签：今天 · 周一 3/25 */
export function formatDayLabel(
  dateStr: string,
  label: string,
  t: (path: string, params?: TranslateParams) => string,
): string {
  const todayKey = new Date().toISOString().slice(0, 10);
  return dateStr === todayKey ? `${t("common.today")} · ${label}` : label;
}
