"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { request } from "@/lib/api/request";
import { memory } from "@eazo/sdk";
import { motion } from "framer-motion";

interface QuickDispatchProps {
  topTaskText: string;
  onTaskAdded: (text: string) => void;
}

export function QuickDispatch({ topTaskText, onTaskAdded }: QuickDispatchProps) {
  const [inputValue, setInputValue] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text) return;

    setAdding(true);
    try {
      const res = await request("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, category: "import-urgent" }),
      });
      await res.json();
      memory.reportAction({
        content: `用户快速添加任务：${text}`,
        event_type: "create",
        page: "monitor",
        metadata: { type: "quick_add_task" },
      }).catch(() => {});
      onTaskAdded(text);
      setInputValue("");
    } catch {
      alert("添加失败，请重试");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="bg-amber-50 p-5 comic-border comic-shadow">
      <p className="font-bangers text-xl text-[#1C1917] mb-2">QUICK DISPATCH</p>
      <p className="text-xs font-comic text-neutral-600 mb-3">
        当前专注科目在计时器上方显示。也可以前往「AI 排期」批量管理任务。
      </p>

      {/* 当前任务显示 */}
      {topTaskText ? (
        <div className="bg-rose-100 border-2 border-rose-400 p-3 flex items-start gap-2 mb-3">
          <span className="bg-[#E11D48] text-white text-[9px] px-1 font-black shrink-0 mt-0.5">A</span>
          <p className="text-xs font-bold text-neutral-800">{topTaskText}</p>
        </div>
      ) : (
        <div className="bg-neutral-100 border-2 border-dashed border-neutral-400 p-3 text-xs text-neutral-500 text-center font-comic mb-3">
          暂无任务，快速添加一个 ↓
        </div>
      )}

      {/* 快速添加表单 */}
      <form onSubmit={handleAdd} className="space-y-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="输入任务名称，如「英语阅读15页」"
          className="w-full px-3 py-2 text-base border-2 border-black bg-white font-semibold placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          disabled={adding}
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.96 }}
          disabled={adding || !inputValue.trim()}
          className="w-full bg-[#1C1917] hover:bg-neutral-800 text-white font-bold py-2 px-3 text-sm comic-border-2 comic-shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span>{adding ? "添加中..." : "快速添加到 A 象限"}</span>
        </motion.button>
      </form>
    </div>
  );
}
