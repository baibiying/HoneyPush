"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { OFFICERS } from "@/lib/officers-data";
import { OfficerSelector } from "./officer-selector";
import { CrtMonitor } from "./crt-monitor";
import { OfficerBubble } from "./officer-bubble";
import { AtomicClock } from "./atomic-clock";
import { BlackBoxLogs } from "./black-box-logs";
import { memory } from "@eazo/sdk";
import { QuickDispatch } from "./quick-dispatch";
import { TodoList } from "./todo-list";
import { OfficerSelectModal } from "./officer-select-modal";

type LogEntry = { time: string; text: string; type: "normal" | "warning" | "success" };

function getNowStr() {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

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
  const [currentOfficerId, setCurrentOfficerId] = useState("yuri");
  const [timer, setTimer] = useState(1500);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isDistracted, setIsDistracted] = useState(false);
  const [mockEventText, setMockEventText] = useState("一切正常");
  const [distractionCount, setDistractionCount] = useState(0);
  const [topTaskText, setTopTaskText] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: "00:00:00", text: "系统启动 - 1950s 显像模式已激活", type: "normal" },
  ]);

  // Officer 选择弹窗状态
  const [showOfficerModal, setShowOfficerModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<{ id: number; text: string } | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeOfficer = OFFICERS.find((o) => o.id === currentOfficerId) ?? OFFICERS[0];

  const addLog = useCallback((text: string, type: LogEntry["type"] = "normal") => {
    setLogs((prev) => [{ time: getNowStr(), text, type }, ...prev.slice(0, 20)]);
  }, []);

  // 从 localStorage 读取最高优先级任务显示在计时器上方
  useEffect(() => {
    try {
      const saved = localStorage.getItem("focus-bureau-tasks");
      if (!saved) return;
      const tasks: Array<{ text: string; checked: boolean; category: string }> = JSON.parse(saved);
      if (!Array.isArray(tasks)) return;
      const priority = ["import-urgent", "import-noturgent", "notimport-urgent", "notimport-noturgent"];
      const top = priority
        .flatMap((cat) => tasks.filter((t) => !t.checked && t.category === cat))
        .find(Boolean);
      if (top) setTopTaskText(top.text);
    } catch { /* ignore */ }
  }, []);

  // Timer tick
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            playChime();
            // 专注完成 — 本地记录专注币
            try {
              const prev = parseInt(localStorage.getItem("focus-bureau-coins") ?? "0", 10);
              localStorage.setItem("focus-bureau-coins", String(prev + 15));
            } catch { /* ignore */ }
            memory.reportAction({
              content: `用户完成一轮25分钟专注，监督官：${activeOfficer.name}，被抓次数：${distractionCount}`,
              event_type: "create",
              page: "monitor",
              metadata: { type: "complete_focus_session", officerId: currentOfficerId },
            }).catch(() => {});
            addLog("成功完成一轮专注！奖励15个专注币", "success");
            setDistractionCount(0);
            return 1500;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerRunning, currentOfficerId, distractionCount, activeOfficer.name, addLog]);

  const handleToggle = () => {
    playChime();
    setTimerRunning((r) => {
      if (!r) addLog("开始新的专注冲刺", "normal");
      else addLog("暂停专注", "normal");
      return !r;
    });
  };

  const handleReset = () => {
    setTimer(1500);
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

  // 处理任务开始流程
  const handleTaskStart = (task: { id: number; text: string; category: string; checked: boolean }) => {
    setSelectedTask({ id: task.id, text: task.text });
    setShowOfficerModal(true);
  };

  const handleLaunch = (officerId: string) => {
    setCurrentOfficerId(officerId);
    setShowOfficerModal(false);
    const officer = OFFICERS.find((o) => o.id === officerId);
    if (officer && selectedTask) {
      setTopTaskText(selectedTask.text);
      addLog(`🎯 开始任务：${selectedTask.text}`, "normal");
      addLog(`👮 监督官：${officer.name}`, "success");
      playChime();
      
      // 自动滚动到顶部 CRT 区域
      window.scrollTo({ top: 0, behavior: "smooth" });
      
      // 1 秒后触发摄像头开启（模拟点击按钮）
      setTimeout(() => {
        const cameraBtn = document.querySelector('button[type="button"]') as HTMLButtonElement;
        if (cameraBtn && cameraBtn.textContent?.includes("开启实景摄像头")) {
          cameraBtn.click();
          addLog("📹 摄像头已自动启动", "success");
        } else {
          // 如果自动触发失败，提示手动点击
          alert(`✅ 任务已就绪！\n\n📹 请点击下方「开启实景摄像头」按钮\n\n${officer.name} 将实时监督你的专注状态。`);
        }
      }, 1000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

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
          onTaskAdded={(text) => {
            setTopTaskText(text);
            playChime();
            addLog(`快速添加任务：${text}`, "success");
          }}
        />

        {/* 任务待办清单 — 从 localStorage 读取 AI 排期的任务 */}
        <TodoList onTaskStart={handleTaskStart} />

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
        onClose={() => setShowOfficerModal(false)}
        onLaunch={handleLaunch}
      />

    </div>
  );
}
