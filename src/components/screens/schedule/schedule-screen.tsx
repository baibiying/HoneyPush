"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { memory } from "@eazo/sdk";
import { request } from "@/lib/api/request";
import { useAuth } from "@/components/auth/auth-provider";
import { useI18n } from "@/i18n/i18n-provider";
import { TASKS_CHANGED_EVENT, emitClientEvent } from "@/lib/client-events";
import { TaskAddPanel } from "./task-add-panel";
import { TaskEditDialog, type ScheduleTask } from "./task-edit-dialog";
import { QuadrantTaskBoard } from "./quadrant-task-board";
import { ScheduleCalendar } from "./schedule-calendar";
const PerformancePanel = dynamic(
  () =>
    import("@/components/screens/performance/performance-panel").then((mod) => ({
      default: mod.PerformancePanel,
    })),
  { ssr: false }
);
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

export function ScheduleScreen() {
  const { t } = useI18n();

  const readApiError = useCallback(async (res: Response) => {
    const data = await res.json().catch(() => null);
    return (data?.error as string | undefined) ?? t("common.operationFailed");
  }, [t]);
  const { user, loading: authLoading, promptLogin } = useAuth();
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [tasksLoadError, setTasksLoadError] = useState<string | null>(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [availabilitySlots, setAvailabilitySlots] = useState(loadAvailabilitySlots);
  const [aiLoading, setAiLoading] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduleTask | null>(null);
  const [openTaskMenuId, setOpenTaskMenuId] = useState<number | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const searchParams = useSearchParams();
  const [scene, setScene] = useState<ScheduleScene>("map");
  const { report: performanceReport, loading: performanceLoading } =
    usePerformanceReport({ defer: true });
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
          ? t("calendar.unscheduledTodo", { count: unscheduledCount })
          : t("calendar.unscheduledTask", { count: unscheduledCount }),
      );
    }

    const snapshot = loadScheduleSnapshot();
    const currentAvailability = serializeAvailabilitySlots(availabilitySlots);
    const availabilityOutOfSync =
      snapshot !== null && currentAvailability !== snapshot.availability;
    const hasScheduledButNoSnapshot = scheduledCount > 0 && snapshot === null;

    if (availabilityOutOfSync || hasScheduledButNoSnapshot) {
      reasons.push(t("calendar.availabilityChanged"));
    }

    if (reasons.length === 0) return null;

    return {
      reasons,
      isReschedule: scheduledCount > 0,
    };
  }, [canEdit, pendingTasks, availabilitySlots, scheduledCount, t]);

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
        label: t("quest.create"),
        done: stats.total > 0,
        scene: "tasks" as const,
      },
      {
        id: "view",
        label: t("quest.view"),
        done: stats.total > 0,
        scene: "tasks" as const,
      },
      {
        id: "time",
        label: t("quest.time"),
        done: validAvailabilityCount > 0,
        scene: "time" as const,
      },
      {
        id: "battle",
        label: t("quest.battle"),
        done: scheduledCount > 0,
        scene: "calendar" as const,
      },
      {
        id: "officer",
        label: t("quest.officer"),
        done: preferredOfficerId !== null,
        scene: "officer" as const,
      },
    ],
    [stats.total, validAvailabilityCount, scheduledCount, preferredOfficerId, t],
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
          setTasksLoading(false);
        });
        return;
      }

      Promise.resolve().then(() => {
        if (!cancelled) setTasksLoading(true);
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
          const message = await readApiError(res).catch(() => t("tasks.loadFailed"));
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
        setTasksLoadError(t("tasks.loadFailed"));
        console.error("[schedule] syncTasks error:", err);
      } finally {
        if (!cancelled) setTasksLoading(false);
      }
    };

    Promise.resolve().then(() => {
      void syncTasks();
    });

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
  }, [authLoading, user, readApiError, t]);

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
        promptLogin(t("prompts.saveTask"));
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
      promptLogin(t("prompts.createTask"));
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
      setScene("tasks");
      playChime();
      memory.reportAction({
        content: `用户添加任务：${task.text}`,
        event_type: "create",
        page: "schedule",
        metadata: { type: "add_task" },
      }).catch(() => {});
    } catch (err) {
      if (err instanceof Error && err.message === "AUTH_REQUIRED") return;
      alert(err instanceof Error ? err.message : t("tasks.addFailed"));
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
      promptLogin(t("prompts.createTask"));
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
      setScene("tasks");
      playChime();
      memory.reportAction({
        content: `用户通过 AI 一次添加 ${created.length} 个任务`,
        event_type: "create",
        page: "schedule",
        metadata: { type: "add_tasks_ai_batch", count: created.length },
      }).catch(() => {});
    } catch (err) {
      if (err instanceof Error && err.message === "AUTH_REQUIRED") return;
      alert(err instanceof Error ? err.message : t("tasks.batchAddFailed"));
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
          promptLogin(t("prompts.editTask"));
          throw new Error("AUTH_REQUIRED");
        }
        throw new Error(await readApiError(res));
      }

      const updated = (await res.json()) as ScheduleTask;
      setTasks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      emitClientEvent(TASKS_CHANGED_EVENT);
      return updated;
    },
    [promptLogin, readApiError, t]
  );

  const handleAiSchedule = useCallback(
    async (options?: { auto?: boolean }) => {
      const isAuto = options?.auto === true;

      if (!canEdit) {
        if (!isAuto) promptLogin(t("prompts.aiSchedule"));
        return;
      }

      if (aiLoading) return;

      if (pendingTasks.length === 0) {
        if (!isAuto) alert(t("calendar.alertNeedTasks"));
        return;
      }

      const missingDeadline = pendingTasks.filter((task) => !task.deadline);
      if (missingDeadline.length > 0) {
        if (!isAuto) alert(t("calendar.alertNeedDeadline"));
        return;
      }

      const availability = availabilitySlots.map(({ date, startTime, endTime }) => ({
        date,
        startTime,
        endTime,
      }));
      if (availability.length === 0) {
        if (!isAuto) alert(t("calendar.alertNeedSlots"));
        return;
      }
      if (buildAvailabilityWindows(availability).length === 0) {
        if (!isAuto) alert(t("calendar.alertSlotsExpired"));
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
            if (!isAuto) promptLogin(t("prompts.aiSchedule"));
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
            alert(t("calendar.alertNoFit"));
          }
          return;
        }

        const plannedIds = new Set(plan.map((item) => item.id));
        const unscheduled = Array.isArray(data.unscheduledIds) ? data.unscheduledIds : [];
        const unscheduledSet = new Set(unscheduled);

        // Clear stale schedule from tasks that no longer fit this scheduling run.
        const staleScheduleIds = pendingTasks
          .filter((task) => !plannedIds.has(task.id) || unscheduledSet.has(task.id))
          .map((task) => task.id);

        const [scheduledUpdates, clearedUpdates] = await Promise.all([
          Promise.all(
            plan.map((item) =>
              updateTaskById(item.id, {
                category: item.category,
                durationMinutes: item.durationMinutes,
                scheduledStartAt: item.scheduledStartAt,
                scheduledEndAt: item.scheduledEndAt,
                scheduledFocusSegments: item.focusSegments ?? null,
              })
            )
          ),
          Promise.all(
            staleScheduleIds.map((id) =>
              updateTaskById(id, {
                scheduledStartAt: null,
                scheduledEndAt: null,
                scheduledFocusSegments: null,
              })
            )
          ),
        ]);
        const updatedTasks = [...scheduledUpdates, ...clearedUpdates];

        setTasks((prev) =>
          prev.map((task) => updatedTasks.find((item) => item.id === task.id) ?? task)
        );

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
        alert(err instanceof Error ? err.message : t("calendar.scheduleFailed"));
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
      readApiError,
      t,
      updateTaskById,
    ]
  );

  const deleteTaskById = async (id: number) => {
    if (!canEdit) {
      promptLogin(t("prompts.deleteTask"));
      return;
    }

    if (!window.confirm(t("common.confirmDeleteTask"))) return;

    try {
      const res = await request(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        if (res.status === 401) {
          promptLogin(t("prompts.deleteTask"));
          return;
        }
        throw new Error(await readApiError(res));
      }

      setTasks((prev) => prev.filter((task) => task.id !== id));
      emitClientEvent(TASKS_CHANGED_EVENT);
    } catch (err) {
      if (err instanceof Error && err.message === "AUTH_REQUIRED") return;
      alert(err instanceof Error ? err.message : t("tasks.deleteFailed"));
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
      alert(err instanceof Error ? err.message : t("tasks.saveFailed"));
    } finally {
      setSavingEdit(false);
    }
  };

  if (authLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="font-bangers text-2xl text-amber-100">{t("hub.loadingTitle")}</p>
          <p className="text-sm font-comic text-amber-100/70">{t("hub.loadingSubtitle")}</p>
        </div>
      </div>
    );
  }

  const scheduleButtonDisabled =
    aiLoading || pendingTasks.length === 0 || validAvailabilityCount === 0;

  const scheduleButtonLabel = aiLoading
    ? t("calendar.scheduling")
    : pendingTasks.length === 0
      ? t("calendar.noPending")
      : validAvailabilityCount === 0
        ? t("calendar.needAvailability")
        : scheduleRefreshHint?.isReschedule
          ? t("calendar.reschedule")
          : t("calendar.schedule");

  return (
    <div className="w-full h-full min-h-0 flex flex-col">
      <ScheduleGameHub
        scene={scene}
        onSceneChange={setScene}
        canEdit={canEdit}
        questSteps={questSteps}
        onOpenAddTask={() => setScene("create")}
        onRequireLogin={promptLogin}
        createTaskPanel={
          <TaskAddPanel
            saving={addingTask}
            onClose={() => setScene("map")}
            onSubmit={handleAddTaskSubmit}
            onSubmitBatch={handleAddTasksBatch}
          />
        }
        tasksPanel={
          tasksLoadError ? (
            <p className="text-center py-12 font-comic text-amber-100/90 text-sm px-4">
              {tasksLoadError}
              <span className="block mt-2 text-xs text-amber-100/70">
                {t("hub.migrateHint")}
              </span>
            </p>
          ) : (
          <QuadrantTaskBoard
            fullscreen
            tasks={activeTasks}
            openTaskMenuId={openTaskMenuId}
            canEdit={canEdit}
            onRequireLogin={() => promptLogin(t("prompts.editOrDeleteTask"))}
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
            loading={tasksLoading || performanceLoading}
            canEdit={canEdit}
            onOpenReport={() => setScene("performance")}
            onRequireLogin={promptLogin}
          />
        }
        performancePanel={
          <PerformancePanel onRequireLogin={promptLogin} canEdit={canEdit} />
        }
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
