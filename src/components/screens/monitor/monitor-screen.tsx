"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { OFFICERS, type OfficerId } from "@/lib/officers-data";
import {
  ENROLLMENT_TIMEOUT_MS,
  formatEnrollmentTimeoutLabel,
} from "@/lib/face-tracking/config";
import type { DistractionEvent, DistractionLevel } from "@/lib/face-tracking/types";
import { readPreferredOfficer, setPreferredOfficer } from "@/lib/preferred-officer";
import { clearStashedExecuteTask, readStashedExecuteTaskId } from "@/lib/execute-task-flow";
import { CrtMonitor, type CrtMonitorHandle } from "./crt-monitor";
import { memory } from "@eazo/sdk";
import { OfficerSelectModal } from "./officer-select-modal";
import { SupervisionOutcomeModal } from "./supervision-outcome-modal";
import { SupervisionBreakOverlay } from "./supervision-break-overlay";
import {
  buildOutcomeStats,
  type DistractionStrikeRecord,
  type SupervisionOutcomeModalState,
} from "@/lib/supervision-outcome";
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
  SUPERVISION_MAX_STRIKES,
  formatBlockLabel,
  formatBlockStartTime,
  getBlockSecondsRemaining,
  getSecondsUntilBlockStart,
  isSupervisionBlockFailed,
  isSupervisionBlockSucceeded,
  resolveSupervisionFocusBlocks,
  SUPERVISION_FOCUS_BLOCK_MINUTES,
  type SupervisionFocusBlock,
} from "@/lib/supervision-blocks";
import {
  markSupervisionLaunched,
  readSupervisionRun,
  setSupervisionRun,
  startSupervisionRun,
  updateSupervisionRun,
} from "@/lib/supervision-run";
import { exitSupervisionTakeover, readSupervisionTakeover } from "@/lib/supervision-takeover";
import {
  exitSupervisionFullscreen,
  requestSupervisionFullscreen,
} from "@/lib/supervision-fullscreen";
import { primeUnmutedVideoPlayback } from "@/lib/unlock-browser-audio";
import { YURI_SUPERVISION_VIDEOS } from "@/lib/officers/yuri-supervision-videos";

type LogEntry = { time: string; text: string; type: "normal" | "warning" | "success" };
type Task = {
  id: number;
  text: string;
  durationMinutes: number;
  category: string;
  checked: boolean;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  scheduledFocusSegments?: Array<{ startAt: string; endAt: string }> | null;
};

const DEFAULT_FOCUS_SECONDS = SUPERVISION_FOCUS_BLOCK_MINUTES * 60;

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
  /** 本段人脸采集完成后才开始专注倒计时 */
  const [blockEnrollmentReady, setBlockEnrollmentReady] = useState(false);
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
  /** 与 distractionCount 同步，避免在 setState 回调里记摸鱼（Strict Mode 会执行两次） */
  const distractionCountRef = useRef(0);
  const cameraClosedByUserRef = useRef(false);
  const completingBlockRef = useRef(false);
  const totalDistractionsRef = useRef(0);
  const blockDistractionsRef = useRef<DistractionStrikeRecord[]>([]);
  const taskDistractionsRef = useRef<DistractionStrikeRecord[]>([]);
  const [outcomeModal, setOutcomeModal] = useState<SupervisionOutcomeModalState | null>(
    null
  );
  const pendingNextBlockRef = useRef<{
    blocks: SupervisionFocusBlock[];
    nextIndex: number;
    taskText: string;
  } | null>(null);
  const [breakPhase, setBreakPhase] = useState<{
    blocks: SupervisionFocusBlock[];
    nextIndex: number;
    taskText: string;
    secondsRemaining: number;
    nextBlockLabel: string;
    nextBlockStartLabel: string;
  } | null>(null);
  const breakPhaseRef = useRef(false);
  /** 本段采集截止（与是否已开摄像头无关） */
  const enrollmentGateDeadlineRef = useRef<number | null>(null);
  const enrollmentGateHandledRef = useRef(false);
  const [focusBlocks, setFocusBlocks] = useState<SupervisionFocusBlock[]>([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const activeOfficer = OFFICERS.find((o) => o.id === currentOfficerId) ?? OFFICERS[0];

  const totalFocusBlocks = focusBlocks.length;
  const currentBlock =
    totalFocusBlocks > 0 ? focusBlocks[currentBlockIndex] ?? focusBlocks[0] : null;

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

  const beginFocusBlock = useCallback(
    (blocks: SupervisionFocusBlock[], blockIndex: number, taskText: string) => {
      const block = blocks[blockIndex];
      if (!block) return;

      const seconds = Math.max(1, getBlockSecondsRemaining(block));
      setFocusBlocks(blocks);
      setCurrentBlockIndex(blockIndex);
      setFocusSeconds(seconds);
      setTimer(seconds);
      setDistractionCount(0);
      distractionCountRef.current = 0;
      setDistractionPlayKey(0);
      setDistractionLevel(1);
      setIsDistracted(false);
      distractionCountedRef.current = false;
      cameraClosedByUserRef.current = false;
      completingBlockRef.current = false;
      blockDistractionsRef.current = [];
      if (blockIndex === 0) {
        totalDistractionsRef.current = 0;
        taskDistractionsRef.current = [];
      }
      setTopTaskText(taskText);
      updateSupervisionRun({
        focusBlocks: blocks,
        currentBlockIndex: blockIndex,
      });
      addLog(
        `🎯 ${formatBlockLabel(blockIndex, blocks.length)}：${taskText}（本段 ${Math.ceil(seconds / 60)} 分钟）`,
        "normal"
      );
      setBlockEnrollmentReady(false);
      setTimerRunning(false);
      enrollmentGateHandledRef.current = false;
      enrollmentGateDeadlineRef.current = Date.now() + ENROLLMENT_TIMEOUT_MS;
      addLog(
        `请在 ${formatEnrollmentTimeoutLabel()}内开启摄像头并完成人脸采集，否则本段失败`,
        "warning"
      );

      queueMicrotask(() => {
        if (crtRef.current?.isCameraActive()) {
          crtRef.current.restartEnrollmentForBlock();
        }
      });
    },
    [addLog]
  );

  const launchSupervisionWithOfficer = useCallback(
    (officerId: OfficerId, task: { id: number; text: string }) => {
      if (officerId === "yuri") {
        primeUnmutedVideoPlayback(YURI_SUPERVISION_VIDEOS.intro);
      }
      setCurrentOfficerId(officerId);
      setShowOfficerModal(false);
      const officer = OFFICERS.find((o) => o.id === officerId);
      const fullTask = tasks.find((item) => item.id === task.id);

      if (!officer) return;

      const blocks = fullTask
        ? resolveSupervisionFocusBlocks(fullTask)
        : resolveSupervisionFocusBlocks({
            id: task.id,
            durationMinutes: SUPERVISION_FOCUS_BLOCK_MINUTES,
          });

      if (blocks.length === 0) {
        addLog("无法拆分专注时段，请先在日历中为任务排期", "warning");
        return;
      }

      totalDistractionsRef.current = 0;
      taskDistractionsRef.current = [];
      blockDistractionsRef.current = [];
      const run = readSupervisionRun();
      const startIndex =
        typeof run?.currentBlockIndex === "number" &&
        run.currentBlockIndex >= 0 &&
        run.currentBlockIndex < blocks.length
          ? run.currentBlockIndex
          : 0;

      markSupervisionLaunched(officerId);
      updateSupervisionRun({
        focusBlocks: blocks,
        currentBlockIndex: startIndex,
        completedBlockIndexes: run?.completedBlockIndexes ?? [],
      });
      addLog(`👮 监督官：${officer.name}`, "success");
      addLog(
        `任务共 ${blocks.length} 个专注 block，全部完成才算任务成功`,
        "normal"
      );
      playChime();
      beginFocusBlock(blocks, startIndex, task.text);

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
    [addLog, beginFocusBlock, tasks]
  );

  const openSupervisionForTask = useCallback(
    (task: Task) => {
      const fullTask = tasks.find((item) => item.id === task.id) ?? task;
      const blocks = resolveSupervisionFocusBlocks(fullTask);

      if (task.scheduledStartAt) {
        startSupervisionRun({
          taskId: task.id,
          taskText: task.text,
          scheduledStartAt: task.scheduledStartAt,
          focusBlocks: blocks,
          currentBlockIndex: 0,
          completedBlockIndexes: [],
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

  const resetSupervisionUi = useCallback(() => {
    setFocusBlocks([]);
    setCurrentBlockIndex(0);
    setTimerRunning(false);
    setDistractionCount(0);
    distractionCountRef.current = 0;
    setBlockEnrollmentReady(false);
    setDistractionPlayKey(0);
    setIsDistracted(false);
    setMockEventText("一切正常");
    distractionCountedRef.current = false;
    cameraClosedByUserRef.current = false;
    completingBlockRef.current = false;
    totalDistractionsRef.current = 0;
    pendingNextBlockRef.current = null;
    setBreakPhase(null);
    breakPhaseRef.current = false;
    blockDistractionsRef.current = [];
    taskDistractionsRef.current = [];
    enrollmentGateDeadlineRef.current = null;
    enrollmentGateHandledRef.current = false;
  }, []);

  const recordDistractionStrike = useCallback(
    (reason: string, blockIndex: number) => {
      const blockNumber = blockIndex + 1;
      const strikeIndexInBlock = blockDistractionsRef.current.length + 1;
      const entry: DistractionStrikeRecord = {
        strikeIndexInBlock,
        blockNumber,
        reason,
      };
      blockDistractionsRef.current.push(entry);
      taskDistractionsRef.current.push(entry);
      totalDistractionsRef.current += 1;
    },
    []
  );

  const buildCurrentOutcomeStats = useCallback(
    (
      run: NonNullable<ReturnType<typeof readSupervisionRun>>,
      completedBlocks: number,
      blockIndex: number,
      record?: { coinsEarned?: number; totalCoins?: number; totalSessions?: number },
      options?: { scope?: "block" | "task" | "through-current-block" }
    ) => {
      const throughBlockNumber = blockIndex + 1;
      let distractions: DistractionStrikeRecord[];
      let totalDistractions: number;

      if (options?.scope === "block") {
        distractions = [...blockDistractionsRef.current];
        totalDistractions = blockDistractionsRef.current.length;
      } else if (options?.scope === "through-current-block") {
        distractions = taskDistractionsRef.current.filter(
          (d) => d.blockNumber <= throughBlockNumber
        );
        totalDistractions = distractions.length;
      } else {
        distractions = [...taskDistractionsRef.current];
        totalDistractions = totalDistractionsRef.current;
      }

      return buildOutcomeStats({
        taskText: run.taskText,
        officerName: activeOfficer.name,
        totalBlocks: run.focusBlocks?.length ?? totalFocusBlocks,
        completedBlocks,
        currentBlockNumber: throughBlockNumber,
        distractions,
        totalDistractions,
        coinsEarned: record?.coinsEarned,
        totalCoins: record?.totalCoins,
        totalSessions: record?.totalSessions,
      });
    },
    [activeOfficer.name, totalFocusBlocks]
  );

  const finalizeSupervisionExit = useCallback(() => {
    setOutcomeModal(null);
    setSupervisionRun(null);
    setShowOfficerModal(false);
    setSelectedTask(null);
    resetSupervisionUi();
    setTimer(focusSeconds);
    exitSupervisionTakeover();
    void exitSupervisionFullscreen();
  }, [focusSeconds, resetSupervisionUi]);

  const stopSupervisionMedia = useCallback(() => {
    try {
      crtRef.current?.stopCamera();
    } catch {
      /* ignore */
    }
    setTimerRunning(false);
  }, []);

  const failCurrentBlock = useCallback(
    async (reason: string) => {
      const run = readSupervisionRun();
      if (!run) return;
      if (abortingSupervisionRef.current) return;
      abortingSupervisionRef.current = true;

      try {
        const officerId = run.officerId ?? currentOfficerId;
        const blockLabel =
          totalFocusBlocks > 0
            ? formatBlockLabel(currentBlockIndex, totalFocusBlocks)
            : "当前 block";
        const record = await recordTaskExecutionFailure({
          taskId: run.taskId,
          officerId,
          distractionCount: totalDistractionsRef.current,
          durationMinutes: SUPERVISION_FOCUS_BLOCK_MINUTES,
        });

        stopSupervisionMedia();
        playBeep();
        addLog(
          record.ok
            ? `任务执行失败：${run.taskText}（${blockLabel} · ${reason}）`
            : `任务执行失败记录未保存：${run.taskText}`,
          record.ok ? "warning" : "normal"
        );

        setOutcomeModal({
          kind: "block-fail",
          failReason: reason,
          recordSaved: record.ok,
          stats: buildCurrentOutcomeStats(
            run,
            run.completedBlockIndexes?.length ?? 0,
            currentBlockIndex,
            {
              totalCoins: record.data?.stats?.totalCoins,
              totalSessions: record.data?.stats?.totalSessions,
            },
            { scope: "through-current-block" }
          ),
        });
      } finally {
        abortingSupervisionRef.current = false;
      }
    },
    [
      addLog,
      buildCurrentOutcomeStats,
      currentBlockIndex,
      currentOfficerId,
      stopSupervisionMedia,
      totalFocusBlocks,
    ]
  );

  const handleCameraClosedByUser = useCallback(() => {
    const run = readSupervisionRun();
    if (!run?.launched) return;
    if (breakPhaseRef.current) return;
    cameraClosedByUserRef.current = true;
    setIsDistracted(false);
    failCurrentBlock("手动关闭摄像头，监督中断");
  }, [failCurrentBlock]);

  const handleEnrollmentReady = useCallback(() => {
    const run = readSupervisionRun();
    if (!run?.launched || breakPhaseRef.current) return;
    if (enrollmentGateHandledRef.current) return;

    const blocks = focusBlocks.length > 0 ? focusBlocks : run.focusBlocks ?? [];
    const blockIndex = currentBlockIndex;
    const block = blocks[blockIndex];
    if (!block) return;

    enrollmentGateHandledRef.current = true;
    enrollmentGateDeadlineRef.current = null;

    const seconds = Math.max(1, getBlockSecondsRemaining(block));
    setFocusSeconds(seconds);
    setTimer(seconds);
    setBlockEnrollmentReady(true);
    setTimerRunning(true);
    addLog(
      `人脸采集完成，${formatBlockLabel(blockIndex, blocks.length)} 专注计时开始（${Math.ceil(seconds / 60)} 分钟）`,
      "success"
    );
  }, [addLog, currentBlockIndex, focusBlocks]);

  const handleEnrollmentTimeout = useCallback(() => {
    if (enrollmentGateHandledRef.current) return;
    const run = readSupervisionRun();
    if (!run?.launched || breakPhaseRef.current) return;

    enrollmentGateHandledRef.current = true;
    enrollmentGateDeadlineRef.current = null;
    setBlockEnrollmentReady(false);
    setTimerRunning(false);
    void failCurrentBlock(
      `人脸采集超时（${formatEnrollmentTimeoutLabel()}内未完成，本段专注失败）`
    );
  }, [failCurrentBlock]);

  const handleEnrollmentTimeoutRef = useRef(handleEnrollmentTimeout);
  handleEnrollmentTimeoutRef.current = handleEnrollmentTimeout;

  useEffect(() => {
    if (blockEnrollmentReady || breakPhase) return;
    const run = readSupervisionRun();
    if (!run?.launched) return;

    const tick = () => {
      const deadline = enrollmentGateDeadlineRef.current;
      if (!deadline || enrollmentGateHandledRef.current) return;
      if (Date.now() >= deadline) {
        handleEnrollmentTimeoutRef.current();
      }
    };

    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [blockEnrollmentReady, breakPhase]);

  const handleEnrollmentFailed = useCallback(
    (reason: string) => {
      if (enrollmentGateHandledRef.current) return;
      const run = readSupervisionRun();
      if (!run?.launched || breakPhaseRef.current) return;
      enrollmentGateHandledRef.current = true;
      enrollmentGateDeadlineRef.current = null;
      setBlockEnrollmentReady(false);
      setTimerRunning(false);
      void failCurrentBlock(`人脸采集失败：${reason}`);
    },
    [failCurrentBlock]
  );

  const handleSupervisionModalClose = useCallback(() => {
    const run = readSupervisionRun();
    if (run && !run.launched) {
      setSupervisionRun(null);
      setSelectedTask(null);
      setShowOfficerModal(false);
      return;
    }
    setShowOfficerModal(false);
  }, []);

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

  const completeTaskSuccess = useCallback(async () => {
    const run = readSupervisionRun();
    if (!run) return;

    const blocks = run.focusBlocks ?? focusBlocks;
    const completedCount = blocks.length;

    if (!user) {
      stopSupervisionMedia();
      addLog("当前为游客模式，任务完成未保存到账号", "normal");
      setOutcomeModal({
        kind: "task-success",
        recordSaved: false,
        stats: buildCurrentOutcomeStats(run, completedCount, currentBlockIndex),
      });
      playChime();
      return;
    }

    const record = await recordTaskExecutionSuccess({
      officerId: currentOfficerId,
      distractionCount: totalDistractionsRef.current,
      taskId: run.taskId,
      durationMinutes: SUPERVISION_FOCUS_BLOCK_MINUTES,
    });

    stopSupervisionMedia();
    addLog(
      record.ok
        ? `任务执行成功：${run.taskText}`
        : "任务完成记录保存失败，请稍后重试",
      record.ok ? "success" : "warning"
    );
    playChime();

    setOutcomeModal({
      kind: "task-success",
      recordSaved: record.ok,
        stats: buildCurrentOutcomeStats(run, completedCount, currentBlockIndex, {
          coinsEarned: record.data?.session?.coinsEarned,
          totalCoins: record.data?.stats?.totalCoins,
          totalSessions: record.data?.stats?.totalSessions,
        }),
    });
  }, [
    addLog,
    buildCurrentOutcomeStats,
    currentOfficerId,
    focusBlocks,
    stopSupervisionMedia,
    user,
  ]);

  const completeCurrentBlock = useCallback(async () => {
    if (completingBlockRef.current) return;
    const run = readSupervisionRun();
    if (!run) return;

    const blocks = run.focusBlocks ?? focusBlocks;
    const block = blocks[currentBlockIndex];
    if (!block) return;

    if (
      isSupervisionBlockFailed({
        distractionCount,
        cameraClosedByUser: cameraClosedByUserRef.current,
      })
    ) {
      return;
    }

    if (
      !isSupervisionBlockSucceeded({
        distractionCount,
        cameraClosedByUser: cameraClosedByUserRef.current,
        block,
      })
    ) {
      return;
    }

    completingBlockRef.current = true;
    setTimerRunning(false);

    const completed = [...(run.completedBlockIndexes ?? []), currentBlockIndex];
    const nextIndex = currentBlockIndex + 1;
    const blockLabel = formatBlockLabel(currentBlockIndex, blocks.length);

    addLog(`${blockLabel} 完成（剩余 ${SUPERVISION_MAX_STRIKES - distractionCount} 颗星）`, "success");
    playChime();

    if (nextIndex >= blocks.length) {
      updateSupervisionRun({ completedBlockIndexes: completed });
      memory.reportAction({
        content: `用户完成任务全部 ${blocks.length} 个专注 block，监督官：${activeOfficer.name}`,
        event_type: "create",
        page: "monitor",
        metadata: { type: "complete_task_blocks", officerId: currentOfficerId },
      }).catch(() => {});
      await completeTaskSuccess();
      completingBlockRef.current = false;
      return;
    }

    updateSupervisionRun({
      completedBlockIndexes: completed,
      currentBlockIndex: nextIndex,
    });
    const nextBlock = blocks[nextIndex];
    const breakSecondsUntilNext = getSecondsUntilBlockStart(nextBlock);
    pendingNextBlockRef.current = {
      blocks,
      nextIndex,
      taskText: run.taskText,
    };
    setOutcomeModal({
      kind: "block-success",
      stats: buildCurrentOutcomeStats(run, completed.length, currentBlockIndex, undefined, {
        scope: "through-current-block",
      }),
      breakSecondsUntilNext,
      nextBlockLabel: formatBlockLabel(nextIndex, blocks.length),
      nextBlockStartLabel: formatBlockStartTime(nextBlock.startAt),
    });
    completingBlockRef.current = false;
  }, [
    activeOfficer.name,
    addLog,
    buildCurrentOutcomeStats,
    completeTaskSuccess,
      currentBlockIndex,
      currentOfficerId,
      focusBlocks,
  ]);

  const tryEvaluateBlockOutcome = useCallback(() => {
    if (!currentBlock || !timerRunning || !blockEnrollmentReady) return;

    if (
      isSupervisionBlockFailed({
        distractionCount,
        cameraClosedByUser: cameraClosedByUserRef.current,
      })
    ) {
      return;
    }

    if (
      isSupervisionBlockSucceeded({
        distractionCount,
        cameraClosedByUser: cameraClosedByUserRef.current,
        block: currentBlock,
      })
    ) {
      void completeCurrentBlock();
    }
  }, [
    completeCurrentBlock,
    currentBlock,
    blockEnrollmentReady,
    distractionCount,
    timerRunning,
  ]);

  // Timer tick：倒计时到 0 或 block 结束时刻 → 判定本 block 成功/失败
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setTimer((prev) => {
          const next = prev <= 1 ? 0 : prev - 1;
          if (next === 0) {
            window.setTimeout(() => void tryEvaluateBlockOutcome(), 0);
          }
          return next <= 0 ? 0 : next;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning, tryEvaluateBlockOutcome]);

  useEffect(() => {
    if (!timerRunning || !currentBlock) return;
    const id = window.setInterval(() => {
      tryEvaluateBlockOutcome();
    }, 2000);
    return () => window.clearInterval(id);
  }, [currentBlock, timerRunning, tryEvaluateBlockOutcome]);

  const reportDistraction = useCallback(
    (event: DistractionEvent) => {
      setIsDistracted(true);
      setDistractionPlayKey((k) => k + 1);
      setMockEventText(event.reason);

      if (currentOfficerId === "yuri") {
        const prev = distractionCountRef.current;
        if (prev >= SUPERVISION_MAX_STRIKES) return;
        const next = Math.min(SUPERVISION_MAX_STRIKES, prev + 1);
        distractionCountRef.current = next;
        recordDistractionStrike(event.reason, currentBlockIndex);
        setDistractionCount(next);
        playBeep();
        addLog(
          `任务第 ${currentBlockIndex + 1} 段 · 第 ${next} 次摸鱼：${event.reason}`,
          "warning"
        );
        return;
      }

      setDistractionLevel(event.level);

      if (event.level >= 2 && !distractionCountedRef.current) {
        distractionCountedRef.current = true;
        const next = distractionCountRef.current + 1;
        distractionCountRef.current = next;
        recordDistractionStrike(event.reason, currentBlockIndex);
        setDistractionCount(next);
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
    [activeOfficer.name, addLog, currentBlockIndex, currentOfficerId, recordDistractionStrike]
  );

  const handleYuriThirdStrikeComplete = useCallback(() => {
    failCurrentBlock("摸鱼：三颗星已全部扣完");
  }, [failCurrentBlock]);

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
      onEnrollmentReady={handleEnrollmentReady}
      onEnrollmentFailed={handleEnrollmentFailed}
      yuriStrikeCount={distractionCount}
      onYuriThirdStrikeComplete={handleYuriThirdStrikeComplete}
      onYuriIdleRecoveryStart={() => {
        setIsDistracted(false);
        setMockEventText("请保持脸部、双手与桌面在画面中");
      }}
      behaviorDetectionPaused={breakPhase != null}
      fillViewport
      focusTimer={
        timerRunning && blockEnrollmentReady && !breakPhase && currentBlock
          ? {
              totalSeconds: focusSeconds,
              remainingSeconds: timer,
              blockLabel:
                totalFocusBlocks > 0
                  ? formatBlockLabel(currentBlockIndex, totalFocusBlocks)
                  : undefined,
            }
          : undefined
      }
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

  const handleOutcomeDismiss = useCallback(() => {
    finalizeSupervisionExit();
  }, [finalizeSupervisionExit]);

  const startNextFocusBlock = useCallback(() => {
    const pending = pendingNextBlockRef.current;
    if (!pending) return;
    pendingNextBlockRef.current = null;
    setOutcomeModal(null);
    setBreakPhase(null);
    breakPhaseRef.current = false;
    addLog(`进入 ${formatBlockLabel(pending.nextIndex, pending.blocks.length)}…`, "normal");
    beginFocusBlock(pending.blocks, pending.nextIndex, pending.taskText);
  }, [addLog, beginFocusBlock]);

  const beginBreakPhaseFromPending = useCallback(
    (options?: { dismissOutcomeModal?: boolean }) => {
      const pending = pendingNextBlockRef.current;
      if (!pending) return;

      if (options?.dismissOutcomeModal) {
        setOutcomeModal(null);
      }

      const nextBlock = pending.blocks[pending.nextIndex];
      const secondsRemaining = getSecondsUntilBlockStart(nextBlock);

      if (secondsRemaining <= 0) {
        startNextFocusBlock();
        return;
      }

      if (breakPhaseRef.current) return;

      breakPhaseRef.current = true;
      setBreakPhase({
        blocks: pending.blocks,
        nextIndex: pending.nextIndex,
        taskText: pending.taskText,
        secondsRemaining,
        nextBlockLabel: formatBlockLabel(pending.nextIndex, pending.blocks.length),
        nextBlockStartLabel: formatBlockStartTime(nextBlock.startAt),
      });
      addLog(
        `段间休息 ${secondsRemaining >= 60 ? `${Math.ceil(secondsRemaining / 60)} 分钟` : `${secondsRemaining} 秒`}，${formatBlockLabel(pending.nextIndex, pending.blocks.length)} 将自动开始`,
        "normal"
      );
    },
    [addLog, startNextFocusBlock]
  );

  const handleStartBreak = useCallback(() => {
    beginBreakPhaseFromPending({ dismissOutcomeModal: true });
  }, [beginBreakPhaseFromPending]);

  useEffect(() => {
    if (outcomeModal?.kind !== "block-success") return;
    if (outcomeModal.breakSecondsUntilNext <= 0) return;
    beginBreakPhaseFromPending({ dismissOutcomeModal: false });
  }, [outcomeModal, beginBreakPhaseFromPending]);

  useEffect(() => {
    if (!breakPhase) return;

    const tick = () => {
      const pending = pendingNextBlockRef.current;
      if (!pending || !breakPhaseRef.current) return;
      const nextBlock = pending.blocks[pending.nextIndex];
      const secondsRemaining = getSecondsUntilBlockStart(nextBlock);
      setBreakPhase((prev) =>
        prev ? { ...prev, secondsRemaining } : null
      );
      if (secondsRemaining <= 0) {
        startNextFocusBlock();
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [breakPhase != null, startNextFocusBlock]);

  return (
    <>
      <div ref={takeoverRootRef} className="relative h-full w-full min-h-0 bg-stone-950">
        {crtMonitor}
        <AnimatePresence>
          {breakPhase && (
            <SupervisionBreakOverlay
              key="supervision-break"
              nextBlockLabel={breakPhase.nextBlockLabel}
              nextBlockStartLabel={breakPhase.nextBlockStartLabel}
              secondsRemaining={breakPhase.secondsRemaining}
              taskText={breakPhase.taskText}
            />
          )}
        </AnimatePresence>
      </div>
      {officerSelectModal}
      <SupervisionOutcomeModal
        outcome={outcomeModal}
        onDismiss={handleOutcomeDismiss}
        onStartBreak={handleStartBreak}
      />
    </>
  );
}
