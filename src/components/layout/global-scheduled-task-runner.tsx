"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { useAutoExecuteScheduledTask } from "@/hooks/use-auto-execute-scheduled-task";
import { useGlobalUpcomingTaskReminders } from "@/hooks/use-global-upcoming-task-reminders";
import { useSupervisionBusy } from "@/hooks/use-supervision-busy";
import { buildExecuteTaskUrl, stashExecuteTask } from "@/lib/execute-task-flow";
import { dismissTaskReminder } from "@/lib/task-reminder-dismissals";
import type { ScheduledTaskLike } from "@/lib/schedule-execution";

/**
 * 全站：到点开始时间后自动跳转监督视窗并进入监督流程。
 * 「即将开始」弹窗在任务进入 active 阶段后由 upcoming 过滤自然消失。
 */
export function GlobalScheduledTaskRunner() {
  const router = useRouter();
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
      stashExecuteTask(task.id);
      router.push(buildExecuteTaskUrl(task.id));
    },
  });

  return null;
}
