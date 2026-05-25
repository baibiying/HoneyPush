"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { memory } from "@eazo/sdk";

interface Task {
  id: number;
  text: string;
  durationMinutes: number;
  category: string;
  checked: boolean;
}

const CATEGORIES: Record<string, { label: string; shortLabel: string; bg: string; headerBg: string; border: string; headerText: string }> = {
  "import-urgent":       { label: "A 象限 · 绝密要紧", shortLabel: "A", bg: "bg-rose-50",   headerBg: "bg-[#E11D48]", border: "border-rose-300",  headerText: "text-white" },
  "import-noturgent":    { label: "B 象限 · 精深核心", shortLabel: "B", bg: "bg-amber-50",  headerBg: "bg-amber-500", border: "border-amber-300", headerText: "text-white" },
  "notimport-urgent":    { label: "C 象限 · 快速流转", shortLabel: "C", bg: "bg-sky-50",    headerBg: "bg-sky-600",   border: "border-sky-200",   headerText: "text-white" },
  "notimport-noturgent": { label: "D 象限 · 尽量废除", shortLabel: "D", bg: "bg-stone-100", headerBg: "bg-stone-600", border: "border-stone-200", headerText: "text-white" },
};

const STORAGE_KEY = "focus-bureau-tasks";

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
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(now + 0.4);
  } catch { /* ignore */ }
}

export function ScheduleScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskText, setNewTaskText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("import-urgent");
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  // 从 localStorage 加载
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setTasks(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 任务变化时自动保存
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
  }, [tasks, loading]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask: Task = {
      id: Date.now(),
      text: newTaskText,
      durationMinutes: 25,
      category: selectedCategory,
      checked: false,
    };
    setTasks((prev) => [newTask, ...prev]);
    setNewTaskText("");
    playChime();
    memory.reportAction({
      content: `用户手动添加任务到 ${CATEGORIES[selectedCategory]?.label}：${newTaskText}`,
      event_type: "create",
      page: "schedule",
      metadata: { type: "add_task", category: selectedCategory },
    }).catch(() => {});
  };

  const handleAiSchedule = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    try {
      const aiTasks: Task[] = [
        { id: Date.now(),     text: `【AI排期】${aiInput}（核心攻坚）`, durationMinutes: 25, category: "import-urgent",    checked: false },
        { id: Date.now() + 1, text: `【AI排期】${aiInput}（细项拆解）`, durationMinutes: 25, category: "import-noturgent", checked: false },
      ];
      setTasks((prev) => [...aiTasks, ...prev]);
      setAiInput("");
      playChime();
      memory.reportAction({
        content: `用户使用 AI 智能排期：${aiInput}`,
        event_type: "create",
        page: "schedule",
        metadata: { type: "ai_schedule" },
      }).catch(() => {});
    } finally {
      setAiLoading(false);
    }
  };

  const toggleTask = (id: number) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, checked: !t.checked } : t)));
  };

  const handleVoiceInput = () => {
    // 如果正在录音，停止
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    // @ts-expect-error SpeechRecognition 实验性 API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("当前浏览器不支持语音输入，推荐使用 Chrome 浏览器");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => {
      const transcript = event.results[0][0].transcript.trim();
      if (!transcript) return;
      setListening(false);
      playChime();

      // 直接创建任务，不需要用户再点提交
      const newTask: Task = {
        id: Date.now(),
        text: transcript,
        durationMinutes: 25,
        category: selectedCategory,
        checked: false,
      };
      setTasks((prev) => {
        const updated = [newTask, ...prev];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      setNewTaskText(transcript); // 同步显示到输入框
      memory.reportAction({
        content: `用户语音添加任务：${transcript}`,
        event_type: "create",
        page: "schedule",
        metadata: { type: "voice_add_task", category: selectedCategory },
      }).catch(() => {});
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const deleteTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-12 flex items-center justify-center min-h-[400px]">
        <div className="text-neutral-500 font-comic">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-12 space-y-6">

      {/* AI 智能规划 */}
      <div className="bg-[#FAF6A2] p-5 comic-border comic-shadow">
        <div className="flex items-center gap-2 pb-2 mb-3 border-b-2 border-[#1C1917]">
          <Mic className="w-5 h-5 text-neutral-800" />
          <h4 className="font-bold text-base tracking-wider font-comic">快速添加任务</h4>
        </div>
        <div className="space-y-3">
          <textarea
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            placeholder="输入「高数冲刺2小时要交」、「英语精读15页」，AI 自动切片并排入四象限日程..."
            className="w-full h-20 p-3 text-base font-semibold bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-yellow-400 text-neutral-900 placeholder-neutral-400 resize-none"
          />
          {/* 象限选择器 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedCategory(key)}
                className={[
                  "py-2 px-3 text-xs font-bold border-2 border-black transition-all text-left",
                  selectedCategory === key
                    ? `${cat.headerBg} ${cat.headerText} comic-shadow-sm scale-[1.02]`
                    : "bg-white text-neutral-600 hover:bg-neutral-50",
                ].join(" ")}
              >
                <span className={`inline-block w-5 h-5 text-center font-bangers text-sm mr-1 ${selectedCategory === key ? "text-white" : ""}`}>{cat.shortLabel}</span>
                <span className="truncate">{cat.label.split("·")[1]?.trim()}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <form onSubmit={handleAddTask} className="flex-1 flex gap-2">
              <input
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder={`输入任务名称 → 加入「${CATEGORIES[selectedCategory]?.label}」`}
                className="flex-1 px-3 py-2 text-base border-2 border-black focus:outline-none bg-white font-semibold"
              />
              <button
                type="submit"
                className="bg-white hover:bg-amber-100 text-xs font-bold py-2 px-4 border-2 border-black comic-shadow-sm flex items-center gap-1 text-[#1C1917]"
              >
                <Plus className="w-4 h-4" />
                <span>手动插入</span>
              </button>
            </form>
            <button
              type="button"
              onClick={handleVoiceInput}
              className={[
                "py-2 px-4 text-xs font-bold border-2 border-black comic-shadow-sm flex items-center gap-1.5 transition-all",
                listening
                  ? "bg-rose-500 text-white animate-pulse"
                  : "bg-neutral-900 hover:bg-neutral-800 text-white",
              ].join(" ")}
              title={listening ? "点击停止录音" : "语音输入任务"}
            >
              <Mic className="w-4 h-4" />
              <span>{listening ? "聆听中..." : "语音输入"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 艾森豪威尔四象限 */}
      <div className="bg-white p-5 comic-border comic-shadow">
        <div className="flex justify-between items-center pb-2 mb-3 border-b-2 border-neutral-900">
          <h4 className="font-black text-sm tracking-wider font-comic">📦 艾森豪威尔·四象限专注日程</h4>
          <span className="text-[10px] bg-red-400 text-black px-1.5 font-bold border border-black">本地存储</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(CATEGORIES).map(([key, cat]) => {
            const categoryTasks = tasks.filter((t) => t.category === key);
            return (
              <div key={key} className={`${cat.bg} border-2 ${cat.border} p-3`}>
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-neutral-200">
                  <span className={`text-[10px] ${cat.headerBg} ${cat.headerText} px-2 py-0.5 font-bold`}>
                    {cat.label}
                  </span>
                  <span className="text-[10px] font-bold text-neutral-500">{categoryTasks.length} 项</span>
                </div>

                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  <AnimatePresence>
                    {categoryTasks.map((t) => (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                        className="flex items-start justify-between gap-2 p-1.5 bg-white border border-[#1C1917]"
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={t.checked}
                            onChange={() => toggleTask(t.id)}
                            className="w-4 h-4 mt-0.5 border-2 border-black rounded-none cursor-pointer accent-yellow-400 shrink-0"
                          />
                          <span className={`text-xs font-bold text-neutral-800 break-words ${t.checked ? "line-through text-gray-400" : ""}`}>
                            {t.text}
                          </span>
                        </div>
                        <button onClick={() => deleteTask(t.id)} className="text-gray-400 hover:text-red-600 p-0.5 shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {categoryTasks.length === 0 && (
                    <div className="text-center text-xs text-neutral-400 py-4 font-comic">暂无任务</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
