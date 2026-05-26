"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TASK_REMINDER_LEAD_MINUTES,
  buildTaskReminderKey,
  getActiveExecutableTasks,
  getUpcomingReminderTasks,
  type ScheduledTaskLike,
} from "@/lib/schedule-execution";
import { isTaskReminderDismissed } from "@/lib/task-reminder-dismissals";

const REMINDER_STORAGE_KEY = "honeypush-task-reminder-sent-v1";

function loadSentReminderKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveSentReminderKeys(keys: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify([...keys]));
}

type UseScheduleTaskRemindersOptions = {
  tasks: ScheduledTaskLike[];
  enabled?: boolean;
  /** 是否尝试浏览器系统通知（需用户授权） */
  enableBrowserNotification?: boolean;
};

export function useScheduleTaskReminders({
  tasks,
  enabled = true,
  enableBrowserNotification = true,
}: UseScheduleTaskRemindersOptions) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const sentKeysRef = useRef<Set<string>>(loadSentReminderKeys());
  const notificationRequestedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNowMs(Date.now());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [enabled]);

  const now = useMemo(() => new Date(nowMs), [nowMs]);

  const pendingScheduled = useMemo(
    () =>
      tasks.filter(
        (task) =>
          !task.checked && task.scheduledStartAt && task.scheduledEndAt
      ),
    [tasks]
  );

  const upcoming = useMemo(
    () => getUpcomingReminderTasks(pendingScheduled, now),
    [pendingScheduled, now]
  );

  const active = useMemo(
    () => getActiveExecutableTasks(pendingScheduled, now),
    [pendingScheduled, now]
  );

  const notifyBrowser = useCallback(
    (title: string, body: string) => {
      if (!enableBrowserNotification || typeof window === "undefined") return;
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      try {
        new Notification(title, { body, tag: "honeypush-task-reminder" });
      } catch {
        /* ignore */
      }
    },
    [enableBrowserNotification]
  );

  useEffect(() => {
    if (!enabled || upcoming.length === 0) return;

    if (
      enableBrowserNotification &&
      !notificationRequestedRef.current &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      notificationRequestedRef.current = true;
      void Notification.requestPermission();
    }

    for (const task of upcoming) {
      if (isTaskReminderDismissed(task)) continue;
      const key = buildTaskReminderKey(task);
      if (sentKeysRef.current.has(key)) continue;
      sentKeysRef.current.add(key);
      notifyBrowser(
        "任务即将开始",
        `「${task.text}」将在 ${TASK_REMINDER_LEAD_MINUTES} 分钟内开始，请做好准备。`
      );
    }

    saveSentReminderKeys(sentKeysRef.current);
  }, [enabled, upcoming, notifyBrowser, enableBrowserNotification]);

  useEffect(() => {
    if (!enabled) return;
    for (const task of active) {
      const key = `${buildTaskReminderKey(task)}:active`;
      if (sentKeysRef.current.has(key)) continue;
      sentKeysRef.current.add(key);
      notifyBrowser(
        "任务已到开始时间",
        `「${task.text}」已开始，将自动进入监督并开启摄像头`
      );
    }
    saveSentReminderKeys(sentKeysRef.current);
  }, [active, enabled, notifyBrowser]);

  return { now, upcoming, active };
}
