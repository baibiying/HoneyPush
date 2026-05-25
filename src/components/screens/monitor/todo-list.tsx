"use client";

import { CheckCircle2, Circle, ListTodo, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface Task {
  id: number;
  text: string;
  durationMinutes: number;
  category: string;
  checked: boolean;
}

const CATEGORY_ORDER = [
  "import-urgent",
  "import-noturgent",
  "notimport-urgent",
  "notimport-noturgent",
];

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; textColor: string }> = {
  "import-urgent":       { label: "A", color: "bg-[#E11D48]", bg: "bg-rose-50",   textColor: "text-rose-700" },
  "import-noturgent":    { label: "B", color: "bg-amber-500", bg: "bg-amber-50",  textColor: "text-amber-700" },
  "notimport-urgent":    { label: "C", color: "bg-sky-600",   bg: "bg-sky-50",    textColor: "text-sky-700" },
  "notimport-noturgent": { label: "D", color: "bg-stone-600", bg: "bg-stone-100", textColor: "text-stone-500" },
};

interface TodoListProps {
  tasks: Task[];
  canEdit: boolean;
  onRequireLogin: () => void;
  onToggleTask: (task: Task) => void;
  onTaskStart?: (task: Task) => void;
}

export function TodoList({
  tasks,
  canEdit,
  onRequireLogin,
  onToggleTask,
  onTaskStart,
}: TodoListProps) {
  // 按 A→B→C→D 顺序排列，未完成的在前
  const sorted = [...tasks].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.category);
    const bi = CATEGORY_ORDER.indexOf(b.category);
    if (ai !== bi) return ai - bi;
    return Number(a.checked) - Number(b.checked);
  });

  const pending = sorted.filter((t) => !t.checked);
  const done = sorted.filter((t) => t.checked);

  return (
    <div className="bg-white p-5 comic-border comic-shadow">
      {/* 标题栏 */}
      <div className="flex justify-between items-center pb-2 mb-3 border-b-4 border-[#1C1917]">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-[#1C1917]" />
          <h4 className="font-bangers text-lg text-[#1C1917] tracking-wide">MISSION LIST</h4>
        </div>
        <Link
          href="/schedule"
          className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 hover:text-[#1C1917] border border-dashed border-neutral-300 px-2 py-0.5 hover:border-black transition-colors"
        >
          <span>去排期</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-6 space-y-2">
          <p className="text-xs text-neutral-400 font-comic">
            {canEdit ? "还没有任务" : "登录后即可同步任务到你的账号"}
          </p>
          {canEdit ? (
            <Link
              href="/schedule"
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 underline"
            >
              前往 AI 排期添加 <ArrowRight className="w-3 h-3" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onRequireLogin}
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 underline"
            >
              登录后开始保存 <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-0.5">
          <AnimatePresence initial={false}>
            {pending.map((task) => {
              const meta = CATEGORY_META[task.category] ?? CATEGORY_META["import-noturgent"];
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`flex items-start gap-2 p-2 border border-[#1C1917] ${meta.bg} cursor-pointer group hover:bg-opacity-80 transition-colors`}
                  onClick={() => {
                    if (!canEdit) {
                      onRequireLogin();
                      return;
                    }
                    onTaskStart?.(task);
                  }}
                >
                  <Circle className="w-4 h-4 mt-0.5 shrink-0 text-neutral-400 group-hover:text-emerald-500 transition-colors" />
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-bold text-neutral-800 break-words leading-snug`}>
                      {task.text}
                    </span>
                  </div>
                  <span className={`shrink-0 ${meta.color} text-white text-[9px] font-black w-4 h-4 flex items-center justify-center`}>
                    {meta.label}
                  </span>
                </motion.div>
              );
            })}

            {/* 已完成任务（折叠显示） */}
            {done.length > 0 && (
              <div className="pt-1 border-t border-dashed border-neutral-200 mt-2">
                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider mb-1 px-1">
                  已完成 {done.length} 项
                </p>
                {done.slice(0, 3).map((task) => {
                  const meta = CATEGORY_META[task.category] ?? CATEGORY_META["import-noturgent"];
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-start gap-2 p-2 border border-neutral-200 bg-neutral-50 cursor-pointer opacity-60"
                      onClick={() => {
                        if (!canEdit) {
                          onRequireLogin();
                          return;
                        }
                        onToggleTask(task);
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                      <span className="text-xs text-neutral-400 line-through flex-1 break-words">{task.text}</span>
                      <span className={`shrink-0 ${meta.color} text-white text-[9px] font-black w-4 h-4 flex items-center justify-center opacity-50`}>
                        {meta.label}
                      </span>
                    </motion.div>
                  );
                })}
                {done.length > 3 && (
                  <p className="text-[9px] text-neutral-400 text-center mt-1">还有 {done.length - 3} 项已完成</p>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 进度条 */}
      {tasks.length > 0 && (
        <div className="mt-3 pt-3 border-t-2 border-neutral-100">
          <div className="flex justify-between text-[10px] font-bold text-neutral-500 mb-1">
            <span>今日进度</span>
            <span>{done.length} / {tasks.length}</span>
          </div>
          <div className="w-full bg-neutral-200 h-2 border border-black">
            <motion.div
              className="bg-emerald-500 h-full border-r-2 border-black"
              initial={{ width: 0 }}
              animate={{ width: tasks.length > 0 ? `${(done.length / tasks.length) * 100}%` : "0%" }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
