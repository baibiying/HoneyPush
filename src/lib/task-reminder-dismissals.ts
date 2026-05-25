import { buildTaskReminderKey, type ScheduledTaskLike } from "@/lib/schedule-execution";

const DISMISSED_STORAGE_KEY = "honeypush-task-reminder-dismissed-v1";

export function loadDismissedReminderKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function saveDismissedReminderKeys(keys: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([...keys]));
}

export function dismissTaskReminder(task: ScheduledTaskLike) {
  const keys = loadDismissedReminderKeys();
  keys.add(buildTaskReminderKey(task));
  saveDismissedReminderKeys(keys);
  return keys;
}

export function isTaskReminderDismissed(
  task: ScheduledTaskLike,
  dismissed?: Set<string>
) {
  const keys = dismissed ?? loadDismissedReminderKeys();
  return keys.has(buildTaskReminderKey(task));
}

/** 点击弹窗关闭按钮后，在此时间内不再显示 */
export const TASK_REMINDER_SNOOZE_MS = 60_000;

export function isTaskReminderSnoozed(
  task: ScheduledTaskLike,
  snoozedUntilByKey?: Map<string, number>,
  nowMs = Date.now()
) {
  if (!snoozedUntilByKey) return false;
  const until = snoozedUntilByKey.get(buildTaskReminderKey(task));
  return until !== undefined && nowMs < until;
}
