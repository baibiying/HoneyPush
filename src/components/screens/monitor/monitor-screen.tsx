"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { OFFICERS, type OfficerId } from "@/lib/officers-data";
import { readPreferredOfficer, setPreferredOfficer } from "@/lib/preferred-officer";
import { clearStashedExecuteTask, readStashedExecuteTaskId } from "@/lib/execute-task-flow";
import { CrtMonitor, type CrtMonitorHandle } from "./crt-monitor";
import { OfficerBubble } from "./officer-bubble";
import { AtomicClock } from "./atomic-clock";
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
  const [mockEventText, setMockEventText] = useState("一切正常");
  const [distractionCount, setDistractionCount] = useState(0);
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
          addLog("📹 摄像头已启动，摸鱼时将播放监督官视频", "success");
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
    void abortSupervisionRun("关闭摄像头");
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

  const handleToggle = () => {
    playChime();
    setTimerRunning((r) => {
      if (!r) addLog("开始新的专注冲刺", "normal");
      else addLog("暂停专注", "normal");
      return !r;
    });
  };

  const handleReset = () => {
    const run = readSupervisionRun();
    if (run?.launched && timerRunning) {
      const confirmed = window.confirm(
        "确定要结束当前监督吗？这将记为本次任务执行失败。"
      );
      if (!confirmed) return;
      void abortSupervisionRun("手动结束监督");
      return;
    }

    setTimer(focusSeconds);
    setTimerRunning(false);
    playBeep();
    addLog("计时器已重置", "normal");
  };

  const triggerMockDistraction = () => {
    setIsDistracted(true);
    setMockEventText("‼ 警告：AI 检测到用户拿起手机 (玩微信中...)");
    setDistractionCount((c) => c + 1);
    playBeep();
    addLog(`检测到摸鱼！${activeOfficer.name}鸣枪空袭警报`, "warning");
  };

  const triggerMockAway = () => {
    setIsDistracted(true);
    setMockEventText("‼ 警告：AI 探测空座 (离开位置摸鱼中...)");
    setDistractionCount((c) => c + 1);
    playBeep();
    addLog("检测到离座！持续12秒", "warning");
  };

  const resolveDistraction = () => {
    setIsDistracted(false);
    setMockEventText("已回归桌前");
    playChime();
    addLog("已解除警报，恢复专注", "success");
  };

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
      mockEventText={mockEventText}
      officerId={currentOfficerId}
      onDistracted={(reason) => {
        setIsDistracted(true);
        setMockEventText(`AI 摄像头检测：${reason}`);
        setDistractionCount((c) => c + 1);
        playBeep();
        addLog(`摄像头检测到摸鱼！${activeOfficer.name}鸣枪警报`, "warning");
      }}
      onFaceRestored={() => {
        setIsDistracted(false);
        setMockEventText("人脸已重新检测到，恢复专注");
        playChime();
        addLog("人脸重新出现，已解除警报", "success");
      }}
      onCameraClosedByUser={handleCameraClosedByUser}
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
    <div
      ref={takeoverRootRef}
      className="flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-b from-[#1e1b4b] via-[#312e81] to-[#1e1b4b]"
    >
      <header className="shrink-0 border-b-2 border-white/15 px-4 py-3 text-center sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/80">
          任务监督
        </p>
        <h2 className="mt-1 font-bangers text-xl sm:text-2xl text-white drop-shadow-[0_2px_0_#1C1917] line-clamp-2">
          {topTaskText || selectedTask?.text || "专注中"}
        </h2>
        <p className="mt-1 text-xs font-bold text-amber-100/80">
          监督官：{activeOfficer.name}
        </p>
      </header>

      <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-4 overflow-y-auto px-3 py-4 sm:gap-5 sm:px-6 sm:py-5 w-full max-w-3xl mx-auto">
        <div className="w-full">{crtMonitor}</div>
        <OfficerBubble
          officer={activeOfficer}
          isDistracted={isDistracted}
          timerRunning={timerRunning}
        />
        <AtomicClock
          timer={timer}
          timerRunning={timerRunning}
          topTaskText={topTaskText}
          onToggle={handleToggle}
          onReset={handleReset}
          onMockDistraction={triggerMockDistraction}
          onMockAway={triggerMockAway}
          onResolve={resolveDistraction}
        />
      </div>

      {officerSelectModal}
    </div>
  );
}
