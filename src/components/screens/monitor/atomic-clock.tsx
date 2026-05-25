"use client";

import { Play, Pause, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface AtomicClockProps {
  timer: number;
  timerRunning: boolean;
  topTaskText: string;
  onToggle: () => void;
  onReset: () => void;
  onMockDistraction: () => void;
  onMockAway: () => void;
  onResolve: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function AtomicClock({
  timer,
  timerRunning,
  topTaskText,
  onToggle,
  onReset,
  onMockDistraction,
  onMockAway,
  onResolve,
}: AtomicClockProps) {
  return (
    <div className="bg-orange-500 p-6 comic-border comic-shadow-lg text-white relative">
      {/* Vintage Starburst badge */}
      <div className="absolute -top-6 -left-6 bg-yellow-400 text-neutral-900 text-xs font-black px-4 py-2 border-4 border-black rounded-none rotate-[-12deg] comic-shadow-sm select-none">
        FOCUSING TIME!
      </div>

      <div className="flex flex-col items-center py-4">
        {/* Digital Clock */}
        <div className="font-bangers text-7xl md:text-8xl tracking-widest text-[#1C1917] drop-shadow-md select-none font-bold">
          {formatTime(timer)}
        </div>

        <p className="text-xs text-amber-500 font-bold bg-[#1C1917] py-1 px-3 mt-1 rounded uppercase tracking-widest max-w-full truncate">
          专注科目：{topTaskText || "暂无安排，速去排期"}
        </p>

        {/* Controls */}
        <div className="flex gap-4 w-full mt-6">
          <motion.button
            onClick={onToggle}
            whileTap={{ scale: 0.94 }}
            className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-neutral-900 font-bangers text-2xl py-3 border-4 border-neutral-900 comic-shadow-sm comic-btn-push transition-all flex items-center justify-center gap-2"
          >
            {timerRunning ? (
              <>
                <Pause className="w-6 h-6" strokeWidth={3} />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-6 h-6 fill-current" strokeWidth={3} />
                <span>LAUNCH</span>
              </>
            )}
          </motion.button>

          <motion.button
            onClick={onReset}
            whileTap={{ scale: 0.94 }}
            className="bg-[#FAF4D3] hover:bg-stone-100 text-[#1C1917] font-bangers text-lg px-6 py-3 border-4 border-neutral-900 comic-shadow-sm comic-btn-push transition-all flex items-center justify-center"
            title="重置"
          >
            <RefreshCw className="w-5 h-5" strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>

      {/* Mock Test Buttons */}
      <div className="mt-4 pt-4 border-t-2 border-orange-600/60">
        <div className="text-[10px] uppercase font-bold text-orange-200 tracking-wider mb-2 text-center">
          专业沙盒测试器（检测模拟区域）
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onMockDistraction}
            className="bg-red-700 hover:bg-red-800 text-[10px] text-white py-1.5 px-1 border-2 border-black font-semibold rounded"
          >
            模拟摸鱼
          </button>
          <button
            onClick={onMockAway}
            className="bg-stone-800 hover:bg-stone-700 text-[10px] text-stone-200 py-1.5 px-1 border-2 border-black font-semibold rounded"
          >
            模拟人脸离座
          </button>
          <button
            onClick={onResolve}
            className="bg-emerald-600 hover:bg-emerald-700 text-[10px] text-white py-1.5 px-0.5 border-2 border-black font-semibold rounded"
          >
            放下手机解除
          </button>
        </div>
      </div>
    </div>
  );
}
