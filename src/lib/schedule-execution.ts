/** 排期开始前多少分钟弹出「即将开始」提醒 */
export const TASK_REMINDER_LEAD_MINUTES = 30;

export type ScheduledTaskLike = {
  id: number;
  text: string;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  checked?: boolean;
};

export type TaskWithDeadline = {
  deadline: string | null;
};

/** 任务截止时刻已过（无 deadline 的任务不算过期） */
export function isTaskPastDeadline(task: TaskWithDeadline, now = new Date()): boolean {
  if (!task.deadline) return false;
  const deadline = new Date(task.deadline);
  if (Number.isNaN(deadline.getTime())) return false;
  return deadline.getTime() < now.getTime();
}

export function excludePastDeadlineTasks<T extends TaskWithDeadline>(
  tasks: T[],
  now = new Date()
): T[] {
  return tasks.filter((task) => !isTaskPastDeadline(task, now));
}

export type TaskExecutionPhase = "unscheduled" | "upcoming" | "active" | "ended";

export function getTaskExecutionPhase(
  task: ScheduledTaskLike,
  now = new Date()
): TaskExecutionPhase {
  if (task.checked || !task.scheduledStartAt || !task.scheduledEndAt) {
    return "unscheduled";
  }

  const start = new Date(task.scheduledStartAt);
  const end = new Date(task.scheduledEndAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "unscheduled";
  }

  const t = now.getTime();
  if (t < start.getTime()) return "upcoming";
  if (t >= end.getTime()) return "ended";
  return "active";
}

export function canExecuteScheduledTask(task: ScheduledTaskLike, now = new Date()) {
  return getTaskExecutionPhase(task, now) === "active";
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function getExecuteBlockedMessage(task: ScheduledTaskLike, now = new Date()) {
  const phase = getTaskExecutionPhase(task, now);
  if (phase === "unscheduled") {
    return "请先在「AI 排期」里为该任务生成日历时段。";
  }
  if (phase === "upcoming") {
    return `该任务尚未到开始时间（${formatDateTime(task.scheduledStartAt!)}），请稍后再执行。`;
  }
  if (phase === "ended") {
    return `该任务的排期时段已结束（截止 ${formatDateTime(task.scheduledEndAt!)}），请重新排期后再执行。`;
  }
  return null;
}

export type ReminderTranslateFn = (
  path: string,
  params?: Record<string, string | number>
) => string;

export function formatMinutesUntilStartLocalized(
  task: ScheduledTaskLike,
  t: ReminderTranslateFn,
  now = new Date()
) {
  const start = new Date(task.scheduledStartAt!);
  const diffMs = start.getTime() - now.getTime();
  if (diffMs <= 0) return t("reminder.countdownStarted");
  const minutes = Math.ceil(diffMs / 60_000);
  if (minutes < 60) return t("reminder.countdownInMinutes", { minutes });
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest > 0) {
    return t("reminder.countdownInHoursMinutes", { hours, rest });
  }
  return t("reminder.countdownInHours", { hours });
}

/** @deprecated Prefer {@link formatMinutesUntilStartLocalized} with i18n */
export function formatMinutesUntilStart(task: ScheduledTaskLike, now = new Date()) {
  const start = new Date(task.scheduledStartAt!);
  const diffMs = start.getTime() - now.getTime();
  if (diffMs <= 0) return "已到开始时间";
  const minutes = Math.ceil(diffMs / 60_000);
  if (minutes < 60) return `${minutes} 分钟后开始`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} 小时 ${rest} 分钟后开始` : `${hours} 小时后开始`;
}

export function isTaskDueForReminder(
  task: ScheduledTaskLike,
  now = new Date(),
  leadMinutes = TASK_REMINDER_LEAD_MINUTES
) {
  if (getTaskExecutionPhase(task, now) !== "upcoming") return false;
  const start = new Date(task.scheduledStartAt!).getTime();
  const leadMs = leadMinutes * 60 * 1000;
  return start - now.getTime() <= leadMs;
}

export function getUpcomingReminderTasks(
  tasks: ScheduledTaskLike[],
  now = new Date(),
  leadMinutes = TASK_REMINDER_LEAD_MINUTES
) {
  return tasks
    .filter((task) => isTaskDueForReminder(task, now, leadMinutes))
    .sort(
      (a, b) =>
        new Date(a.scheduledStartAt!).getTime() - new Date(b.scheduledStartAt!).getTime()
    );
}

export function getActiveExecutableTasks(tasks: ScheduledTaskLike[], now = new Date()) {
  return tasks
    .filter((task) => canExecuteScheduledTask(task, now))
    .sort(
      (a, b) =>
        new Date(a.scheduledStartAt!).getTime() - new Date(b.scheduledStartAt!).getTime()
    );
}

export function buildTaskReminderKey(task: ScheduledTaskLike) {
  return `${task.id}:${task.scheduledStartAt ?? ""}`;
}

export function toScheduledTaskLike(task: {
  id: number;
  text: string;
  checked?: boolean;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
}): ScheduledTaskLike {
  return {
    id: task.id,
    text: task.text,
    checked: task.checked,
    scheduledStartAt: task.scheduledStartAt ?? null,
    scheduledEndAt: task.scheduledEndAt ?? null,
  };
}
