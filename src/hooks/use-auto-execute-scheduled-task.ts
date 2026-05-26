"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  buildTaskReminderKey,
  canExecuteScheduledTask,
  getActiveExecutableTasks,
  type ScheduledTaskLike,
} from "@/lib/schedule-execution";

const AUTO_EXECUTE_STORAGE_KEY = "honeypush-auto-execute-v1";
const RETRY_MS = 5_000;
const MAX_SCHEDULE_MS = 7 * 24 * 60 * 60 * 1000;

function loadAutoExecuteKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(AUTO_EXECUTE_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveAutoExecuteKeys(keys: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTO_EXECUTE_STORAGE_KEY, JSON.stringify([...keys]));
}

type UseAutoExecuteScheduledTaskOptions = {
  tasks: ScheduledTaskLike[];
  enabled?: boolean;
  /** 正在专注或已弹出监督官选择时不再自动唤起 */
  isBusy?: boolean;
  onBeginExecute: (task: ScheduledTaskLike) => void;
};

export function useAutoExecuteScheduledTask({
  tasks,
  enabled = true,
  isBusy = false,
  onBeginExecute,
}: UseAutoExecuteScheduledTaskOptions) {
  const promptedKeysRef = useRef<Set<string>>(loadAutoExecuteKeys());
  const onBeginRef = useRef(onBeginExecute);
  onBeginRef.current = onBeginExecute;

  const pendingScheduled = useMemo(
    () =>
      tasks.filter(
        (task) =>
          !task.checked && task.scheduledStartAt && task.scheduledEndAt
      ),
    [tasks]
  );

  const tryPromptExecute = useCallback(
    (task: ScheduledTaskLike) => {
      if (!enabled) return false;
      if (!canExecuteScheduledTask(task)) return false;

      const key = buildTaskReminderKey(task);
      if (promptedKeysRef.current.has(key)) return false;
      if (isBusy) return false;

      promptedKeysRef.current.add(key);
      saveAutoExecuteKeys(promptedKeysRef.current);
      onBeginRef.current(task);
      return true;
    },
    [enabled, isBusy]
  );

  // 为每个排期注册到点定时器
  useEffect(() => {
    if (!enabled || pendingScheduled.length === 0) return;

    const timeoutIds: ReturnType<typeof setTimeout>[] = [];

    for (const task of pendingScheduled) {
      const startMs = new Date(task.scheduledStartAt!).getTime();
      if (Number.isNaN(startMs)) continue;

      const delay = startMs - Date.now();
      if (delay > MAX_SCHEDULE_MS) continue;

      if (delay <= 0) {
        tryPromptExecute(task);
        continue;
      }

      timeoutIds.push(
        setTimeout(() => {
          tryPromptExecute(task);
        }, delay)
      );
    }

    return () => {
      for (const id of timeoutIds) clearTimeout(id);
    };
  }, [enabled, pendingScheduled, tryPromptExecute]);

  // 页面打开时若已过开始时间、或定时器因忙碌未触发，则轮询重试
  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      const now = new Date();
      const active = getActiveExecutableTasks(pendingScheduled, now);
      if (active.length === 0) return;
      tryPromptExecute(active[0]);
    };

    tick();
    const id = window.setInterval(tick, RETRY_MS);
    return () => window.clearInterval(id);
  }, [enabled, pendingScheduled, tryPromptExecute]);
}
