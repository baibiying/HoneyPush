"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { memory } from "@eazo/sdk";
import { request } from "@/lib/api/request";
import { useAuth } from "@/components/auth/auth-provider";
import { TASKS_CHANGED_EVENT, emitClientEvent } from "@/lib/client-events";
import { TaskAddDialog } from "./task-add-dialog";
import { TaskEditDialog, type ScheduleTask } from "./task-edit-dialog";
import { QuadrantTaskBoard } from "./quadrant-task-board";
import { ScheduleCalendar } from "./schedule-calendar";
import { PerformancePanel } from "@/components/screens/performance/performance-panel";
import { usePerformanceReport } from "@/hooks/use-performance-report";
import { ScheduleGameHub, type ScheduleScene } from "./schedule-game-hub";
import { MapPerformanceDock } from "./map-performance-dock";
import { ScheduleOfficerPanel } from "./schedule-officer-panel";
import {
  PREFERRED_OFFICER_CHANGED_EVENT,
  readPreferredOfficer,
} from "@/lib/preferred-officer";
import type { OfficerId } from "@/lib/officers-data";
import { SchedulePromptOverlay } from "./schedule-prompt-overlay";
import { ScheduleUnscheduledNotice } from "./schedule-unscheduled-notice";
import {
  AvailabilityEditor,
  toAvailabilityRows,
  type AvailabilitySlotRow,
} from "./availability-editor";
import {
  buildAvailabilityWindows,
  getClientTimezoneOffsetMinutes,
  type AvailabilitySlotInput,
} from "@/lib/ai/availability";
import { excludePastDeadlineTasks } from "@/lib/schedule-execution";

const AVAILABILITY_STORAGE_KEY = "honeypush-availability-v1";
const SCHEDULE_SNAPSHOT_KEY = "honeypush-schedule-snapshot-v1";

type ScheduleSnapshot = {
  availability: string;
};

function loadScheduleSnapshot(): ScheduleSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SCHEDULE_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScheduleSnapshot;
    if (parsed && typeof parsed.availability === "string") return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function saveScheduleSnapshot(availability: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    SCHEDULE_SNAPSHOT_KEY,
    JSON.stringify({ availability } satisfies ScheduleSnapshot)
  );
}

function serializeAvailabilitySlots(slots: AvailabilitySlotRow[]) {
  return JSON.stringify(
    slots
      .map(({ date, startTime, endTime }) => ({ date, startTime, endTime }))
      .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))
  );
}

function loadAvailabilitySlots(): AvailabilitySlotRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AVAILABILITY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AvailabilitySlotInput[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return toAvailabilityRows(parsed);
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

function playChime() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.08);
    osc.frequency.setValueAtTime(783.99, now + 0.16);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.4);
  } catch {
    /* ignore */
  }
}

async function readApiError(res: Response) {
  const data = await res.json().catch(() => null);
  return (data?.error as string | undefined) ?? "操作失败，请稍后重试";
}

export function ScheduleScreen() {
  const router = useRouter();
  const { user, loading: authLoading, promptLogin } = useAuth();
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [tasksLoadError, setTasksLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [availabilitySlots, setAvailabilitySlots] = useState(loadAvailabilitySlots);
  const [aiLoading, setAiLoading] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduleTask | null>(null);
  const [openTaskMenuId, setOpenTaskMenuId] = useState<number | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const searchParams = useSearchParams();
  const [scene, setScene] = useState<ScheduleScene>("map");
  const { report: performanceReport, loading: performanceLoading } = usePerformanceReport();
  const [preferredOfficerId, setPreferredOfficerId] = useState<OfficerId | null>(null);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [schedulePromptOpen, setSchedulePromptOpen] = useState(false);
  const [unscheduledNotice, setUnscheduledNotice] = useState<{
    scheduledCount: number;
    taskNames: string[];
  } | null>(null);
  const prevSceneRef = useRef<ScheduleScene>("map");

  const canEdit = Boolean(user);

  useEffect(() => {
    if (searchParams.get("scene") === "performance") {
      setScene("performance");
    }
  }, [searchParams]);

  useEffect(() => {
    setPreferredOfficerId(readPreferredOfficer());
    const refresh = () => setPreferredOfficerId(readPreferredOfficer());
    window.addEventListener(PREFERRED_OFFICER_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(PREFERRED_OFFICER_CHANGED_EVENT, refresh);
  }, []);

  const activeTasks = useMemo(
    () => excludePastDeadlineTasks(tasks),
    [tasks]
  );

  const stats = useMemo(() => {
    const pending = activeTasks.filter((task) => !task.checked).length;
    const done = activeTasks.length - pending;
    return { total: activeTasks.length, pending, done };
  }, [activeTasks]);

  const pendingTasks = useMemo(
    () => activeTasks.filter((task) => !task.checked),
    [activeTasks]
  );

  const scheduledCount = useMemo(
    () =>
      pendingTasks.filter((task) => task.scheduledStartAt && task.scheduledEndAt).length,
    [pendingTasks]
  );

  const scheduleRefreshHint = useMemo(() => {
    if (!canEdit || pendingTasks.length === 0) return null;

    const reasons: string[] = [];
    const unscheduledCount = pendingTasks.filter(
      (task) => !task.scheduledStartAt || !task.scheduledEndAt
    ).length;

    if (unscheduledCount > 0) {
      reasons.push(
        unscheduledCount === pendingTasks.length
          ? `${unscheduledCount} 条待办尚未排期`
          : `${unscheduledCount} 条任务尚未排期`
      );
    }

    const snapshot = loadScheduleSnapshot();
    const currentAvailability = serializeAvailabilitySlots(availabilitySlots);
    const availabilityOutOfSync =
      snapshot !== null && currentAvailability !== snapshot.availability;
    const hasScheduledButNoSnapshot = scheduledCount > 0 && snapshot === null;

    if (availabilityOutOfSync || hasScheduledButNoSnapshot) {
      reasons.push("可用时段已调整");
    }

    if (reasons.length === 0) return null;

    return {
      reasons,
      isReschedule: scheduledCount > 0,
    };
  }, [canEdit, pendingTasks, availabilitySlots, scheduledCount]);

  const validAvailabilityCount = useMemo(() => {
    const payload = availabilitySlots.map(({ date, startTime, endTime }) => ({
      date,
      startTime,
      endTime,
    }));
    return buildAvailabilityWindows(payload).length;
  }, [availabilitySlots]);

  const questSteps = useMemo(
    () => [
      {
        id: "create",
        label: "创建任务",
        done: stats.total > 0,
        scene: "tasks" as const,
      },
      {
        id: "view",
        label: "查看任务",
        done: stats.total > 0,
        scene: "tasks" as const,
      },
      {
        id: "time",
        label: "可用时段",
        done: validAvailabilityCount > 0,
        scene: "time" as const,
      },
      {
        id: "battle",
        label: "AI 排期",
        done: scheduledCount > 0,
        scene: "calendar" as const,
      },
      {
        id: "officer",
        label: "选择监督官",
        done: preferredOfficerId !== null,
        scene: "officer" as const,
      },
    ],
    [stats.total, validAvailabilityCount, scheduledCount, preferredOfficerId]
  );

  useEffect(() => {
    const payload = availabilitySlots.map(({ date, startTime, endTime }) => ({
      date,
      startTime,
      endTime,
    }));
    localStorage.setItem(AVAILABILITY_STORAGE_KEY, JSON.stringify(payload));
  }, [availabilitySlots]);

  useEffect(() => {
    const enteredCalendar = scene === "calendar" && prevSceneRef.current !== "calendar";
    prevSceneRef.current = scene;

    if (scene !== "calendar") {
      setSchedulePromptOpen(false);
      return;
    }

    if (enteredCalendar && scheduleRefreshHint) {
      setSchedulePromptOpen(true);
    }
  }, [scene, scheduleRefreshHint]);

  useEffect(() => {
    if (openTaskMenuId === null) return;
    const close = () => setOpenTaskMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openTaskMenuId]);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    const syncTasks = async () => {
      if (!user) {
        Promise.resolve().then(() => {
          if (cancelled) return;
          setTasks([]);
          setTasksLoadError(null);
          setLoading(false);
        });
        return;
      }

      Promise.resolve().then(() => {
        if (!cancelled) setLoading(true);
      });

      try {
        const res = await request("/api/tasks", { cache: "no-store" });
        if (!res.ok) {
          if (cancelled) return;
          setTasks([]);
          if (res.status === 401) {
            setTasksLoadError(null);
            return;
          }
          const message = await readApiError(res).catch(() => "任务加载失败");
          setTasksLoadError(message);
          console.error("[schedule] syncTasks failed:", message);
          return;
        }

        const items = (await res.json()) as ScheduleTask[];
        if (cancelled) return;
        setTasks(items);
        setTasksLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setTasks([]);
        setTasksLoadError("任务加载失败，请刷新页面或稍后重试");
        console.error("[schedule] syncTasks error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    Promise.resolve().then(() => {
      void syncTasks();
    });

    const refresh = () => {
      void syncTasks();
    };

    window.addEventListener(TASKS_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(TASKS_CHANGED_EVENT, refresh);
    };
  }, [authLoading, user]);

  const createTask = async (input: {
    text: string;
    category: string;
    durationMinutes?: number;
    deadline: string;
  }) => {
    const res = await request("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      if (res.status === 401) {
        promptLogin("登录后才能把任务保存到 HoneyPush。");
        throw new Error("AUTH_REQUIRED");
      }
      throw new Error(await readApiError(res));
    }

    const task = (await res.json()) as ScheduleTask;
    emitClientEvent(TASKS_CHANGED_EVENT);
    return task;
  };

  const handleAddTaskSubmit = async (payload: {
    text: string;
    category: string;
    durationMinutes: number;
    deadline: string;
  }) => {
    if (!canEdit) {
      promptLogin("登录后才能创建并保存任务。");
      return;
    }

    setAddingTask(true);
    try {
      const task = await createTask({
        text: payload.text,
        category: payload.category,
        durationMinutes: payload.durationMinutes,
        deadline: payload.deadline,
      });
      setTasks((prev) => [task, ...prev]);
      setAddTaskOpen(false);
      playChime();
      memory.reportAction({
        content: `用户添加任务：${task.text}`,
        event_type: "create",
        page: "schedule",
        metadata: { type: "add_task" },
      }).catch(() => {});
    } catch (err) {
      if (err instanceof Error && err.message === "AUTH_REQUIRED") return;
      alert(err instanceof Error ? err.message : "添加失败，请重试");
    } finally {
      setAddingTask(false);
    }
  };

  const handleAddTasksBatch = async (
    payloads: Array<{
      text: string;
      category: string;
      durationMinutes: number;
      deadline: string;
    }>
  ) => {
    if (!canEdit) {
      promptLogin("登录后才能创建并保存任务。");
      return;
    }
    if (payloads.length === 0) return;

    setAddingTask(true);
    try {
      const created: ScheduleTask[] = [];
      for (const payload of payloads) {
        created.push(
          await createTask({
            text: payload.text,
            category: payload.category,
            durationMinutes: payload.durationMinutes,
            deadline: payload.deadline,
          })
        );
      }
      setTasks((prev) => [...created.reverse(), ...prev]);
      setAddTaskOpen(false);
      playChime();
      memory.reportAction({
        content: `用户通过 AI 一次添加 ${created.length} 个任务`,
        event_type: "create",
        page: "schedule",
        metadata: { type: "add_tasks_ai_batch", count: created.length },
      }).catch(() => {});
    } catch (err) {
      if (err instanceof Error && err.message === "AUTH_REQUIRED") return;
      alert(err instanceof Error ? err.message : "批量添加失败，请重试");
    } finally {
      setAddingTask(false);
    }
  };

  const updateTaskById = useCallback(
    async (
      id: number,
      payload: Partial<
        Pick<
          ScheduleTask,
          | "text"
          | "checked"
          | "category"
          | "durationMinutes"
          | "deadline"
          | "scheduledStartAt"
          | "scheduledEndAt"
          | "scheduledFocusSegments"
        >
      >
    ) => {
      const res = await request(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 401) {
          promptLogin("登录后才能修改任务。");
          throw new Error("AUTH_REQUIRED");
        }
        throw new Error(await readApiError(res));
      }

      const updated = (await res.json()) as ScheduleTask;
      setTasks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      emitClientEvent(TASKS_CHANGED_EVENT);
      return updated;
    },
    [promptLogin]
  );

  const handleAiSchedule = useCallback(
    async (options?: { auto?: boolean }) => {
      const isAuto = options?.auto === true;

      if (!canEdit) {
        if (!isAuto) promptLogin("登录后才能使用 AI 排期。");
        return;
      }

      if (aiLoading) return;

      if (pendingTasks.length === 0) {
        if (!isAuto) alert("请先在「创建任务」里添加至少一条待办。");
        return;
      }

      const missingDeadline = pendingTasks.filter((task) => !task.deadline);
      if (missingDeadline.length > 0) {
        if (!isAuto) alert("请为每条待排期任务填写截止时间后再执行 AI 排期。");
        return;
      }

      const availability = availabilitySlots.map(({ date, startTime, endTime }) => ({
        date,
        startTime,
        endTime,
      }));
      if (availability.length === 0) {
        if (!isAuto) alert("请至少添加一个今天或未来几天的可用时间段。");
        return;
      }
      if (buildAvailabilityWindows(availability).length === 0) {
        if (!isAuto) alert("可用时间段均已过期，请添加今天或未来的时段后再排期。");
        return;
      }

      setAiLoading(true);
      try {
        const res = await request("/api/ai-schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            availability,
            timezoneOffsetMinutes: getClientTimezoneOffsetMinutes(),
            tasks: pendingTasks.map((task) => ({
              id: task.id,
              text: task.text,
              durationMinutes: task.durationMinutes,
              category: task.category,
              deadline: task.deadline,
            })),
          }),
        });

        if (!res.ok) {
          if (res.status === 401) {
            if (!isAuto) promptLogin("登录后才能使用 AI 排期。");
            return;
          }
          throw new Error(await readApiError(res));
        }

        const data = (await res.json()) as {
          schedule?: Array<{
            id: number;
            category: string;
            durationMinutes: number;
            order: number;
            scheduledStartAt: string;
            scheduledEndAt: string;
            focusSegments?: Array<{ startAt: string; endAt: string }>;
          }>;
          unscheduledIds?: number[];
          unscheduledTasks?: Array<{ id: number; text: string }>;
          source?: string;
        };

        const plan = Array.isArray(data.schedule) ? data.schedule : [];
        if (plan.length === 0) {
          if (!isAuto) {
            alert("在可用时间段内无法排下任何任务，请增加未来几天的时段或缩短任务时长。");
          }
          return;
        }

        const updatedTasks = await Promise.all(
          plan.map((item) =>
            updateTaskById(item.id, {
              category: item.category,
              durationMinutes: item.durationMinutes,
              scheduledStartAt: item.scheduledStartAt,
              scheduledEndAt: item.scheduledEndAt,
              scheduledFocusSegments: item.focusSegments ?? null,
            })
          )
        );

        setTasks((prev) =>
          prev.map((task) => updatedTasks.find((item) => item.id === task.id) ?? task)
        );

        const unscheduled = Array.isArray(data.unscheduledIds) ? data.unscheduledIds : [];
        if (unscheduled.length > 0) {
          const namesFromApi = Array.isArray(data.unscheduledTasks)
            ? data.unscheduledTasks.map((item) => item.text).filter(Boolean)
            : [];
          const names =
            namesFromApi.length > 0
              ? namesFromApi
              : unscheduled
                  .map((id) => pendingTasks.find((task) => task.id === id)?.text)
                  .filter((text): text is string => Boolean(text));
          setUnscheduledNotice({ scheduledCount: plan.length, taskNames: names });
        } else {
          setUnscheduledNotice(null);
        }

      playChime();
      setCalendarRefreshKey((key) => key + 1);
      saveScheduleSnapshot(serializeAvailabilitySlots(availabilitySlots));
      setSchedulePromptOpen(false);
      memory.reportAction({
          content: isAuto
            ? `可用时段变更后自动为 ${plan.length} 条任务重新 AI 排期`
            : `用户对 ${plan.length} 条任务执行 AI 排期`,
          event_type: "update",
          page: "schedule",
          metadata: {
            type: isAuto ? "ai_schedule_auto_availability" : "ai_schedule_existing",
            source: data.source ?? "unknown",
          },
        }).catch(() => {});
      } catch (err) {
        if (err instanceof Error && err.message === "AUTH_REQUIRED") return;
        alert(err instanceof Error ? err.message : "AI 排期失败，请重试");
      } finally {
        setAiLoading(false);
      }
    },
    [
      aiLoading,
      availabilitySlots,
      canEdit,
      pendingTasks,
      promptLogin,
      updateTaskById,
    ]
  );

  const deleteTaskById = async (id: number) => {
    if (!canEdit) {
      promptLogin("登录后才能删除任务。");
      return;
    }

    if (!window.confirm("确定删除这个任务吗？")) return;

    try {
      const res = await request(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        if (res.status === 401) {
          promptLogin("登录后才能删除任务。");
          return;
        }
        throw new Error(await readApiError(res));
      }

      setTasks((prev) => prev.filter((task) => task.id !== id));
      emitClientEvent(TASKS_CHANGED_EVENT);
    } catch (err) {
      if (err instanceof Error && err.message === "AUTH_REQUIRED") return;
      alert(err instanceof Error ? err.message : "删除失败，请重试");
    }
  };

  const handleSaveEdit = async (payload: {
    text: string;
    category: string;
    durationMinutes: number;
    deadline: string;
  }) => {
    if (!editingTask) return;

    setSavingEdit(true);
    try {
      await updateTaskById(editingTask.id, {
        ...payload,
        scheduledStartAt: null,
        scheduledEndAt: null,
        scheduledFocusSegments: null,
      });
      setEditingTask(null);
      playChime();
    } catch (err) {
      if (err instanceof Error && err.message === "AUTH_REQUIRED") return;
      alert(err instanceof Error ? err.message : "保存失败，请重试");
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="font-bangers text-2xl text-[#1C1917]">加载副本中...</p>
          <p className="text-sm font-comic text-neutral-500">正在同步你的任务存档</p>
        </div>
      </div>
    );
  }

  const scheduleButtonDisabled =
    aiLoading || pendingTasks.length === 0 || validAvailabilityCount === 0;

  const scheduleButtonLabel = aiLoading
    ? "AI 排期中..."
    : pendingTasks.length === 0
      ? "暂无待排任务"
      : validAvailabilityCount === 0
        ? "先设可用时段"
        : scheduleRefreshHint?.isReschedule
          ? "重新排期"
          : scheduleRefreshHint
            ? "排期"
            : "排期";

  return (
    <div className="w-full h-full min-h-0 flex flex-col">
      <ScheduleGameHub
        scene={scene}
        onSceneChange={setScene}
        canEdit={canEdit}
        questSteps={questSteps}
        onOpenAddTask={() => setAddTaskOpen(true)}
        onRequireLogin={promptLogin}
        tasksPanel={
          tasksLoadError ? (
            <p className="text-center py-12 font-comic text-amber-100/90 text-sm px-4">
              {tasksLoadError}
              <span className="block mt-2 text-xs text-amber-100/70">
                若刚更新过代码，请在项目目录执行：npm run db:migrate
              </span>
            </p>
          ) : (
          <QuadrantTaskBoard
            fullscreen
            tasks={activeTasks}
            openTaskMenuId={openTaskMenuId}
            canEdit={canEdit}
            onRequireLogin={() => promptLogin("登录后才能编辑或删除任务。")}
            onMenuToggle={(taskId) =>
              setOpenTaskMenuId((prev) => (prev === taskId ? null : taskId))
            }
            onEdit={(task) => {
              setOpenTaskMenuId(null);
              setEditingTask(task);
            }}
            onDelete={(taskId) => {
              setOpenTaskMenuId(null);
              void deleteTaskById(taskId);
            }}
          />
          )
        }
        timePanel={
          <AvailabilityEditor
            slots={availabilitySlots}
            onChange={setAvailabilitySlots}
            showHeader={false}
            variant="game"
          />
        }
        scheduleCalendarHidden={schedulePromptOpen || Boolean(unscheduledNotice)}
        scheduleOverlay={
          <>
            {scheduleRefreshHint ? (
              <SchedulePromptOverlay
                open={schedulePromptOpen}
                reasons={scheduleRefreshHint.reasons}
                isReschedule={scheduleRefreshHint.isReschedule}
                loading={aiLoading}
                buttonDisabled={scheduleButtonDisabled}
                buttonLabel={scheduleButtonLabel}
                onSchedule={() => void handleAiSchedule({ auto: false })}
                onViewCalendar={() => setSchedulePromptOpen(false)}
              />
            ) : null}
            {unscheduledNotice ? (
              <ScheduleUnscheduledNotice
                open
                scheduledCount={unscheduledNotice.scheduledCount}
                taskNames={unscheduledNotice.taskNames}
                onDismiss={() => setUnscheduledNotice(null)}
              />
            ) : null}
          </>
        }
        schedulePanel={
          <ScheduleCalendar
            key={calendarRefreshKey}
            tasks={activeTasks}
            embedded
          />
        }
        officerPanel={
          <ScheduleOfficerPanel
            selectedId={preferredOfficerId}
            canEdit={canEdit}
            onSelected={setPreferredOfficerId}
            onRequireLogin={promptLogin}
          />
        }
        mapPerformanceDock={
          <MapPerformanceDock
            report={performanceReport}
            loading={performanceLoading}
            canEdit={canEdit}
            onOpenReport={() => setScene("performance")}
            onRequireLogin={promptLogin}
          />
        }
        performancePanel={
          <PerformancePanel onRequireLogin={promptLogin} canEdit={canEdit} />
        }
      />

      <TaskAddDialog
        open={addTaskOpen}
        saving={addingTask}
        onOpenChange={setAddTaskOpen}
        onSubmit={handleAddTaskSubmit}
        onSubmitBatch={handleAddTasksBatch}
      />

      <TaskEditDialog
        task={editingTask}
        open={Boolean(editingTask)}
        saving={savingEdit}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null);
        }}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
