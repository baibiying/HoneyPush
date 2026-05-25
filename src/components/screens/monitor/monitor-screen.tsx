"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OFFICERS } from "@/lib/officers-data";
import {
  EXECUTE_TASK_QUERY,
  clearStashedExecuteTask,
  readStashedExecuteTaskId,
} from "@/lib/execute-task-flow";
import { OfficerSelector } from "./officer-selector";
import { CrtMonitor, type CrtMonitorHandle } from "./crt-monitor";
import { OfficerBubble } from "./officer-bubble";
import { AtomicClock } from "./atomic-clock";
import { BlackBoxLogs } from "./black-box-logs";
import { memory } from "@eazo/sdk";
import { QuickDispatch } from "./quick-dispatch";
import { TodoList } from "./todo-list";
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

export function MonitorScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, promptLogin } = useAuth();
  const [currentOfficerId, setCurrentOfficerId] = useState("yuri");
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
  const executeHandledRef = useRef(false);
  const activeOfficer = OFFICERS.find((o) => o.id === currentOfficerId) ?? OFFICERS[0];

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
      setShowOfficerModal(true);
    },
    []
  );

  const abortSupervisionRun = useCallback(
    async (reason: string) => {
      const run = readSupervisionRun();
      if (!run) return false;

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
      addLog(
        ok
          ? `任务执行失败已记录：${run.taskText}（${reason}）`
          : `任务执行失败记录未保存：${run.taskText}`,
        ok ? "warning" : "normal"
      );
      playBeep();
      return ok;
    },
    [addLog, currentOfficerId, distractionCount, focusSeconds]
  );

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

    const queryRaw = searchParams.get(EXECUTE_TASK_QUERY);
    const queryId = queryRaw ? Number(queryRaw) : NaN;
    const stashId = readStashedExecuteTaskId();
    const taskId = Number.isFinite(queryId) ? queryId : stashId;
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
      if (queryRaw) router.replace("/monitor");
      alert(blocked);
      return;
    }

    executeHandledRef.current = true;
    clearStashedExecuteTask();
    if (queryRaw) router.replace("/monitor");

    openSupervisionForTask(task);
    addLog(`进入任务执行：${task.text}`, "normal");
  }, [addLog, authLoading, openSupervisionForTask, reminderNow, router, searchParams, tasks, user]);

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

  const handleSelectOfficer = (id: string) => {
    setCurrentOfficerId(id);
    playChime();
    const officer = OFFICERS.find((o) => o.id === id);
    if (officer) addLog(`切换监督官：${officer.name}`, "normal");
  };

  const handleTaskStart = (task: ScheduledTaskLike) => {
    if (!user) {
      promptLogin("登录后才能启动任务并保存专注记录。");
      return;
    }
    const full = tasks.find((item) => item.id === task.id);
    if (!full) return;
    if (full.scheduledStartAt && full.scheduledEndAt) {
      const blocked = getExecuteBlockedMessage(toScheduledTaskLike(full), reminderNow);
      if (blocked) {
        alert(blocked);
        return;
      }
    }
    openSupervisionForTask(full);
  };

  const handleToggleTask = async (task: Task) => {
    if (!user) {
      promptLogin("登录后才能修改任务状态。");
      return;
    }

    try {
      const res = await request(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: !task.checked }),
      });

      if (!res.ok) {
        if (res.status === 401) promptLogin("登录后才能修改任务状态。");
        throw new Error("PATCH_TASK_FAILED");
      }

      const updated = (await res.json()) as Task;
      setTasks((prev) => {
        const next = prev.map((item) => (item.id === updated.id ? updated : item));
        syncTopTask(next, selectedTask?.text ?? null);
        return next;
      });
      emitClientEvent(TASKS_CHANGED_EVENT);
    } catch {
      addLog("任务状态更新失败", "warning");
    }
  };

  const handleLaunch = async (officerId: string) => {
    setCurrentOfficerId(officerId);
    setShowOfficerModal(false);
    const officer = OFFICERS.find((o) => o.id === officerId);
    const fullTask = selectedTask
      ? tasks.find((item) => item.id === selectedTask.id)
      : undefined;

    if (officer && selectedTask) {
      const minutes = Math.max(
        15,
        Math.min(180, Math.round(fullTask?.durationMinutes ?? 25))
      );
      const seconds = minutes * 60;
      setFocusSeconds(seconds);
      setTimer(seconds);
      setDistractionCount(0);
      setTopTaskText(selectedTask.text);
      markSupervisionLaunched(officerId);
      addLog(`🎯 开始任务：${selectedTask.text}（${minutes} 分钟）`, "normal");
      addLog(`👮 监督官：${officer.name}`, "success");
      playChime();
      setTimerRunning(true);

      window.scrollTo({ top: 0, behavior: "smooth" });

      try {
        await crtRef.current?.startCamera();
        addLog("📹 摄像头已启动，摸鱼时将播放监督官视频", "success");
      } catch {
        addLog("请手动点击「开启实景摄像头」以开始监督", "warning");
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-12">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

      {/* Column 1: Officer Roster (3 cols) */}
      <aside className="lg:col-span-3 space-y-6">
        <OfficerSelector
          officers={OFFICERS}
          currentId={currentOfficerId}
          onSelect={handleSelectOfficer}
        />
        <BlackBoxLogs entries={logs} />
      </aside>

      {/* Column 2: CRT Monitor + Clock (5 cols) */}
      <section className="lg:col-span-5 space-y-6">
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
        />
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
      </section>

      {/* Column 3: Quick Dispatch — 可直接添加任务 */}
      <section className="lg:col-span-4 space-y-4">
        <QuickDispatch
          topTaskText={topTaskText}
          canEdit={Boolean(user)}
          onRequireLogin={() => promptLogin("登录后才能创建并保存任务。")}
          onTaskAdded={(task) => {
            setTasks((prev) => {
              const next = [task, ...prev];
              syncTopTask(next, selectedTask?.text ?? null);
              return next;
            });
            setTopTaskText(task.text);
            playChime();
            addLog(`快速添加任务：${task.text}`, "success");
          }}
        />

        <TodoList
          tasks={tasks}
          now={reminderNow}
          canEdit={Boolean(user)}
          onRequireLogin={() => promptLogin("登录后才能查看并同步你的任务列表。")}
          onToggleTask={handleToggleTask}
          onTaskStart={(task) => handleTaskStart(toScheduledTaskLike(task))}
        />

        {/* Officer quotes reference card */}
        <div className="bg-white p-5 comic-border comic-shadow-sm">
          <p className="font-bangers text-lg text-[#1C1917] mb-3 border-b-2 border-black pb-1">OFFICER ROSTER</p>
          <div className="space-y-2">
            {OFFICERS.map((o) => (
              <div key={o.id} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: o.color }}></div>
                <span className="text-xs font-bold text-neutral-700">{o.name}</span>
                <span className="text-[10px] text-neutral-400 truncate">— {o.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Officer 选择弹窗 */}
      <OfficerSelectModal
        taskText={selectedTask?.text ?? ""}
        isOpen={showOfficerModal}
        onClose={handleSupervisionModalClose}
        onLaunch={handleLaunch}
      />

    </div>
    </div>
  );
}
