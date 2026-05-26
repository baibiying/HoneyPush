"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { OFFICERS, type OfficerId } from "@/lib/officers-data";
import { ENROLLMENT_TIMEOUT_MINUTES } from "@/lib/face-tracking/config";
import type { DistractionEvent, DistractionLevel } from "@/lib/face-tracking/types";
import { readPreferredOfficer, setPreferredOfficer } from "@/lib/preferred-officer";
import { clearStashedExecuteTask, readStashedExecuteTaskId } from "@/lib/execute-task-flow";
import { CrtMonitor, type CrtMonitorHandle } from "./crt-monitor";
import { memory } from "@eazo/sdk";
import { OfficerSelectModal } from "./officer-select-modal";
import { request } from "@/lib/api/request";
import { useAuth } from "@/components/auth/auth-provider";
import { TASKS_CHANGED_EVENT, emitClientEvent } from "@/lib/client-events";
import {
  getExecuteBlockedMessage,
  toScheduledTaskLike,
  type ScheduledTaskLike,
} from "@/lib/schedule-execution";
import { useScheduleTaskReminders } from "@/hooks/use-schedule-task-reminders";
import { recordTaskExecutionFailure, recordTaskExecutionSuccess } from "@/lib/record-task-execution";
import {
  markSupervisionLaunched,
  readSupervisionRun,
  setSupervisionRun,
  startSupervisionRun,
} from "@/lib/supervision-run";
import { exitSupervisionTakeover, readSupervisionTakeover } from "@/lib/supervision-takeover";
import {
  exitSupervisionFullscreen,
  requestSupervisionFullscreen,
} from "@/lib/supervision-fullscreen";

type LogEntry = { time: string; text: string; type: "normal" | "warning" | "success" };
type Task = {
  id: number;
  text: string;
  durationMinutes: number;
  category: string;
  checked: boolean;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
};

const DEFAULT_FOCUS_SECONDS = 25 * 60;

function getNowStr() {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

const PRIORITY_ORDER = [
  "import-urgent",
  "import-noturgent",
  "notimport-urgent",
  "notimport-noturgent",
];

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = "sawtooth"; osc2.type = "square";
    osc1.frequency.setValueAtTime(120, ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(350, ctx.currentTime + 0.3);
    osc2.frequency.setValueAtTime(100, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
    osc1.start(); osc2.start();
    osc1.stop(ctx.currentTime + 0.4); osc2.stop(ctx.currentTime + 0.4);
  } catch { /* ignore */ }
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.08);
    osc.frequency.setValueAtTime(783.99, now + 0.16);
    osc.frequency.setValueAtTime(1046.50, now + 0.24);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(now + 0.5);
  } catch { /* ignore */ }
}

/** 仅由全站监督叠层挂载；任务到点自动弹出 */
export function MonitorScreen() {
  const { user, loading: authLoading } = useAuth();
  const [currentOfficerId, setCurrentOfficerId] = useState<OfficerId>("yuri");
  const [focusSeconds, setFocusSeconds] = useState(DEFAULT_FOCUS_SECONDS);
  const [timer, setTimer] = useState(DEFAULT_FOCUS_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isDistracted, setIsDistracted] = useState(false);
  const [distractionLevel, setDistractionLevel] = useState<DistractionLevel>(1);
  const [mockEventText, setMockEventText] = useState("一切正常");
  const [distractionCount, setDistractionCount] = useState(0);
  const [distractionPlayKey, setDistractionPlayKey] = useState(0);
  const [focusPlayKey, setFocusPlayKey] = useState(0);
  const [topTaskText, setTopTaskText] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: "00:00:00", text: "系统启动 - 1950s 显像模式已激活", type: "normal" },
  ]);

  // Officer 选择弹窗状态
  const [showOfficerModal, setShowOfficerModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<{ id: number; text: string } | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const crtRef = useRef<CrtMonitorHandle>(null);
  const takeoverRootRef = useRef<HTMLDivElement>(null);
  const executeHandledRef = useRef(false);
  const abortingSupervisionRef = useRef(false);
  const distractionCountedRef = useRef(false);
  const activeOfficer = OFFICERS.find((o) => o.id === currentOfficerId) ?? OFFICERS[0];

  useEffect(() => {
    const preferred = readPreferredOfficer();
    if (preferred) setCurrentOfficerId(preferred);
  }, []);

  const pendingScheduledTasks: ScheduledTaskLike[] = tasks
    .filter((task) => !task.checked && task.scheduledStartAt && task.scheduledEndAt)
    .map(toScheduledTaskLike);

  const { now: reminderNow } = useScheduleTaskReminders({
    tasks: pendingScheduledTasks,
    enabled: Boolean(user) && !authLoading,
    enableBrowserNotification: true,
  });

  const syncTopTask = useCallback((items: Task[], activeTask?: string | null) => {
    if (activeTask?.trim()) {
      setTopTaskText(activeTask);
      return;
    }

    const top = PRIORITY_ORDER
      .flatMap((category) => items.filter((task) => !task.checked && task.category === category))
      .find(Boolean);

    setTopTaskText(top?.text ?? "");
  }, []);

  const addLog = useCallback((text: string, type: LogEntry["type"] = "normal") => {
    setLogs((prev) => [{ time: getNowStr(), text, type }, ...prev.slice(0, 20)]);
  }, []);

  const launchSupervisionWithOfficer = useCallback(
    async (officerId: OfficerId, task: { id: number; text: string }) => {
      setCurrentOfficerId(officerId);
      setShowOfficerModal(false);
      const officer = OFFICERS.find((o) => o.id === officerId);
      const fullTask = tasks.find((item) => item.id === task.id);

      if (!officer) return;

      const minutes = Math.max(
        15,
        Math.min(180, Math.round(fullTask?.durationMinutes ?? 25))
      );
      const seconds = minutes * 60;
      setFocusSeconds(seconds);
      setTimer(seconds);
      setDistractionCount(0);
      setDistractionPlayKey(0);
      setDistractionLevel(1);
      setIsDistracted(false);
      distractionCountedRef.current = false;
      setTopTaskText(task.text);
      markSupervisionLaunched(officerId);
      addLog(`🎯 开始任务：${task.text}（${minutes} 分钟）`, "normal");
      addLog(`👮 监督官：${officer.name}`, "success");
      playChime();
      setTimerRunning(true);

      window.scrollTo({ top: 0, behavior: "smooth" });

      void requestSupervisionFullscreen(takeoverRootRef.current);

      const startCameraWithRetry = async (attempt = 0) => {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        try {
          await crtRef.current?.startCamera();
          addLog(
            "📹 摄像头已启动：请调整角度，确保画面包含脸部、双手与桌面",
            "success"
          );
        } catch {
          if (attempt < 2) {
            window.setTimeout(() => void startCameraWithRetry(attempt + 1), 400);
            return;
          }
          addLog("请手动点击「开启实景摄像头」以开始监督", "warning");
        }
      };
      void startCameraWithRetry();
    },
    [addLog, tasks]
  );

  const openSupervisionForTask = useCallback(
    (task: { id: number; text: string; scheduledStartAt?: string | null }) => {
      if (task.scheduledStartAt) {
        startSupervisionRun({
          taskId: task.id,
          taskText: task.text,
          scheduledStartAt: task.scheduledStartAt,
        });
      } else {
        setSupervisionRun(null);
      }
      setSelectedTask({ id: task.id, text: task.text });

      const preferred = readPreferredOfficer();
      if (preferred) {
        void launchSupervisionWithOfficer(preferred, task);
        return;
      }
      setShowOfficerModal(true);
    },
    [launchSupervisionWithOfficer]
  );

  const abortSupervisionRun = useCallback(
    async (reason: string) => {
      const run = readSupervisionRun();
      if (!run) return false;
      if (abortingSupervisionRef.current) return false;
      abortingSupervisionRef.current = true;

      try {
        const officerId = run.officerId ?? currentOfficerId;
        const ok = await recordTaskExecutionFailure({
          taskId: run.taskId,
          officerId,
          distractionCount,
          durationMinutes: Math.max(1, Math.round(focusSeconds / 60)),
        });

        try {
          crtRef.current?.stopCamera();
        } catch {
          /* ignore */
        }

        setSupervisionRun(null);
        setShowOfficerModal(false);
        setSelectedTask(null);
        setTimerRunning(false);
        setTimer(focusSeconds);
        setDistractionCount(0);
        setDistractionPlayKey(0);
        setIsDistracted(false);
        setMockEventText("一切正常");
        exitSupervisionTakeover();
        void exitSupervisionFullscreen();
        addLog(
          ok
            ? `任务执行失败已记录：${run.taskText}（${reason}）`
            : `任务执行失败记录未保存：${run.taskText}`,
          ok ? "warning" : "normal"
        );
        playBeep();
        return ok;
      } finally {
        abortingSupervisionRef.current = false;
      }
    },
    [addLog, currentOfficerId, distractionCount, focusSeconds]
  );

  const handleCameraClosedByUser = useCallback(() => {
    const run = readSupervisionRun();
    if (!run?.launched) return;
    setIsDistracted(false);
    void abortSupervisionRun("关闭摄像头");
  }, [abortSupervisionRun]);

  const handleEnrollmentTimeout = useCallback(() => {
    void abortSupervisionRun(
      `人脸采集超时（${ENROLLMENT_TIMEOUT_MINUTES} 分钟未完成）`
    );
  }, [abortSupervisionRun]);

  const handleSupervisionModalClose = useCallback(() => {
    const run = readSupervisionRun();
    if (run && !run.launched) {
      void abortSupervisionRun("已取消监督流程");
      return;
    }
    setShowOfficerModal(false);
  }, [abortSupervisionRun]);

  useEffect(() => {
    if (authLoading) return;

    const activeTaskText = selectedTask?.text ?? null;
    let cancelled = false;

    const syncTasks = async () => {
      if (!user) {
        Promise.resolve().then(() => {
          if (cancelled) return;
          setTasks([]);
          setSelectedTask(null);
          syncTopTask([], null);
        });
        return;
      }

      try {
        const res = await request("/api/tasks", { cache: "no-store" });
        if (!res.ok) {
          if (cancelled) return;
          setTasks([]);
          syncTopTask([], null);
          return;
        }

        const items = (await res.json()) as Task[];
        if (cancelled) return;
        setTasks(items);
        syncTopTask(items, activeTaskText);
      } catch {
        if (cancelled) return;
        setTasks([]);
        syncTopTask([], null);
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
  }, [authLoading, selectedTask, syncTopTask, user]);

  useEffect(() => {
    if (authLoading || !user || tasks.length === 0 || executeHandledRef.current) return;

    const stashId = readStashedExecuteTaskId();
    const takeoverId = readSupervisionTakeover()?.taskId ?? null;
    const taskId = stashId ?? takeoverId;
    if (!taskId) return;

    const task = tasks.find((item) => item.id === taskId && !item.checked);
    if (!task) return;

    const blocked =
      task.scheduledStartAt && task.scheduledEndAt
        ? getExecuteBlockedMessage(toScheduledTaskLike(task), reminderNow)
        : null;
    if (blocked) {
      executeHandledRef.current = true;
      clearStashedExecuteTask();
      exitSupervisionTakeover();
      alert(blocked);
      return;
    }

    executeHandledRef.current = true;
    clearStashedExecuteTask();

    openSupervisionForTask(task);
    addLog(`进入任务执行：${task.text}`, "normal");
  }, [
    addLog,
    authLoading,
    openSupervisionForTask,
    reminderNow,
    tasks,
    user,
  ]);

  const persistCompletedSession = useCallback(async () => {
    if (!user) {
      addLog("当前为游客模式，本轮专注未保存到账号", "normal");
      return;
    }

    const run = readSupervisionRun();
    const ok = await recordTaskExecutionSuccess({
      officerId: currentOfficerId,
      distractionCount,
      taskId: run?.taskId,
      durationMinutes: Math.max(1, Math.round(focusSeconds / 60)),
    });

    if (ok) {
      setSupervisionRun(null);
      exitSupervisionTakeover();
      void exitSupervisionFullscreen();
    } else {
      addLog("专注记录保存失败，请稍后重试", "warning");
    }
  }, [addLog, currentOfficerId, distractionCount, focusSeconds, user]);

  // Timer tick
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            playChime();
            void persistCompletedSession();
            memory.reportAction({
              content: `用户完成一轮25分钟专注，监督官：${activeOfficer.name}，被抓次数：${distractionCount}`,
              event_type: "create",
              page: "monitor",
              metadata: { type: "complete_focus_session", officerId: currentOfficerId },
            }).catch(() => {});
            addLog("成功完成一轮专注！奖励15个专注币", "success");
            setDistractionCount(0);
            return focusSeconds;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [
    timerRunning,
    currentOfficerId,
    distractionCount,
    focusSeconds,
    activeOfficer.name,
    addLog,
    persistCompletedSession,
  ]);

  const reportDistraction = useCallback(
    (event: DistractionEvent) => {
      setIsDistracted(true);
      setDistractionLevel(event.level);
      setDistractionPlayKey((k) => k + 1);
      setMockEventText(event.reason);

      if (event.level >= 2 && !distractionCountedRef.current) {
        distractionCountedRef.current = true;
        setDistractionCount((c) => c + 1);
      }

      if (event.level === 1) {
        playChime();
        addLog(`轻微走神：${event.reason}`, "normal");
      } else {
        playBeep();
        const levelLabel =
          event.level === 4
            ? "身份异常"
            : event.level === 3
              ? "严重离座"
              : "摸鱼抓包";
        addLog(`${levelLabel} · ${activeOfficer.name} 监督视频已触发`, "warning");
      }
    },
    [activeOfficer.name, addLog]
  );

  const handleLaunch = async (officerId: string) => {
    if (!selectedTask) return;
    const id = officerId as OfficerId;
    setPreferredOfficer(id);
    await launchSupervisionWithOfficer(id, selectedTask);
  };

  const crtMonitor = (
    <CrtMonitor
      ref={crtRef}
      isDistracted={isDistracted}
      distractionLevel={distractionLevel}
      mockEventText={mockEventText}
      officerId={currentOfficerId}
      distractionPlayKey={distractionPlayKey}
      focusPlayKey={focusPlayKey}
      onDistracted={reportDistraction}
      onFaceRestored={() => {
        setIsDistracted(false);
        setDistractionLevel(1);
        distractionCountedRef.current = false;
        setFocusPlayKey((k) => k + 1);
        setMockEventText("已恢复劳动，继续专注");
        playChime();
        addLog("恢复劳动，监督官切回正常督促", "success");
      }}
      onCameraClosedByUser={handleCameraClosedByUser}
      onEnrollmentTimeout={handleEnrollmentTimeout}
      fillViewport
    />
  );

  const officerSelectModal = (
    <OfficerSelectModal
      taskText={selectedTask?.text ?? ""}
      isOpen={showOfficerModal}
      onClose={handleSupervisionModalClose}
      onLaunch={handleLaunch}
    />
  );

  return (
    <>
      <div ref={takeoverRootRef} className="h-full w-full min-h-0 bg-stone-950">
        {crtMonitor}
      </div>
      {officerSelectModal}
    </>
  );
}
