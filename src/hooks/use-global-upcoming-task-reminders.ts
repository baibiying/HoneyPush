"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { request } from "@/lib/api/request";
import { TASKS_CHANGED_EVENT } from "@/lib/client-events";
import {
  getUpcomingReminderTasks,
  toScheduledTaskLike,
  type ScheduledTaskLike,
} from "@/lib/schedule-execution";
import {
  TASK_REMINDER_SNOOZE_MS,
  dismissTaskReminder,
  isTaskReminderDismissed,
  isTaskReminderSnoozed,
  loadDismissedReminderKeys,
} from "@/lib/task-reminder-dismissals";
import { buildTaskReminderKey } from "@/lib/schedule-execution";
import { preloadOfficerVideos } from "@/lib/officers/preload-officer-videos";
import { readPreferredOfficer } from "@/lib/preferred-officer";

/** 任务开始前 20 分钟内预加载监督官视频 */
const UPCOMING_TASK_PRELOAD_MS = 20 * 60 * 1000;

type ApiTask = {
  id: number;
  text: string;
  checked: boolean;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
};

type UseGlobalUpcomingTaskRemindersOptions = {
  enabled?: boolean;
};

export function useGlobalUpcomingTaskReminders({
  enabled = true,
}: UseGlobalUpcomingTaskRemindersOptions = {}) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [tasks, setTasks] = useState<ScheduledTaskLike[]>([]);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(() =>
    loadDismissedReminderKeys()
  );
  const [snoozedUntilByKey, setSnoozedUntilByKey] = useState<Map<string, number>>(
    () => new Map()
  );
  const snoozeTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNowMs(Date.now());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setTasks([]);
      return;
    }

    let cancelled = false;

    const syncTasks = async () => {
      try {
        const res = await request("/api/tasks", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setTasks([]);
          return;
        }
        const items = (await res.json()) as ApiTask[];
        if (cancelled) return;
        setTasks(
          items
            .filter((task) => !task.checked && task.scheduledStartAt && task.scheduledEndAt)
            .map(toScheduledTaskLike)
        );
      } catch {
        if (!cancelled) setTasks([]);
      }
    };

    void syncTasks();
    const refresh = () => {
      void syncTasks();
    };
    window.addEventListener(TASKS_CHANGED_EVENT, refresh);
    window.addEventListener("online", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(TASKS_CHANGED_EVENT, refresh);
      window.removeEventListener("online", refresh);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || tasks.length === 0) return;
    const officerId = readPreferredOfficer();
    if (!officerId) return;

    const hasTaskStartingSoon = tasks.some((task) => {
      if (!task.scheduledStartAt) return false;
      const startMs = new Date(task.scheduledStartAt).getTime();
      if (Number.isNaN(startMs)) return false;
      const delta = startMs - nowMs;
      return delta > 0 && delta <= UPCOMING_TASK_PRELOAD_MS;
    });

    if (hasTaskStartingSoon) {
      void preloadOfficerVideos(officerId);
    }
  }, [enabled, tasks, nowMs]);

  const now = useMemo(() => new Date(nowMs), [nowMs]);

  const upcoming = useMemo(() => {
    const due = getUpcomingReminderTasks(tasks, now);
    return due.filter(
      (task) =>
        !isTaskReminderDismissed(task, dismissedKeys) &&
        !isTaskReminderSnoozed(task, snoozedUntilByKey, nowMs)
    );
  }, [tasks, now, dismissedKeys, snoozedUntilByKey, nowMs]);

  const dismissPermanent = useCallback((task: ScheduledTaskLike) => {
    setDismissedKeys(dismissTaskReminder(task));
  }, []);

  const snooze = useCallback((task: ScheduledTaskLike) => {
    const key = buildTaskReminderKey(task);
    const until = Date.now() + TASK_REMINDER_SNOOZE_MS;

    const existing = snoozeTimeoutsRef.current.get(key);
    if (existing) clearTimeout(existing);

    setSnoozedUntilByKey((prev) => {
      const next = new Map(prev);
      next.set(key, until);
      return next;
    });

    const timeoutId = setTimeout(() => {
      setSnoozedUntilByKey((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      snoozeTimeoutsRef.current.delete(key);
    }, TASK_REMINDER_SNOOZE_MS);

    snoozeTimeoutsRef.current.set(key, timeoutId);
  }, []);

  useEffect(() => {
    const timeouts = snoozeTimeoutsRef.current;
    return () => {
      for (const id of timeouts.values()) {
        clearTimeout(id);
      }
      timeouts.clear();
    };
  }, []);

  return { now, tasks, upcoming, dismissPermanent, snooze };
}
