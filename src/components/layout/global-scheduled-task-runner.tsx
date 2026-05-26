"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useAutoExecuteScheduledTask } from "@/hooks/use-auto-execute-scheduled-task";
import { useGlobalUpcomingTaskReminders } from "@/hooks/use-global-upcoming-task-reminders";
import { useSupervisionBusy } from "@/hooks/use-supervision-busy";
import { beginAutoTaskSupervision } from "@/lib/execute-task-flow";
import { dismissTaskReminder } from "@/lib/task-reminder-dismissals";
import type { ScheduledTaskLike } from "@/lib/schedule-execution";

/**
 * 全站：到点后全屏接管监督视窗并自动进入监督流程（任意页面生效）。
 */
export function GlobalScheduledTaskRunner() {
  const { user, loading: authLoading } = useAuth();
  const supervisionBusy = useSupervisionBusy();

  const { tasks } = useGlobalUpcomingTaskReminders({
    enabled: Boolean(user) && !authLoading,
  });

  useAutoExecuteScheduledTask({
    tasks,
    enabled: Boolean(user) && !authLoading,
    isBusy: supervisionBusy,
    onBeginExecute: (task: ScheduledTaskLike) => {
      dismissTaskReminder(task);
      beginAutoTaskSupervision(task.id);
    },
  });

  return null;
}
