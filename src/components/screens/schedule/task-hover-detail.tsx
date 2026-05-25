"use client";

import { Calendar, Clock, LayoutGrid } from "lucide-react";
import type { ScheduleTask } from "./task-edit-dialog";
import { planPomodoroSegments } from "@/lib/ai/schedule-times";
import { getQuadrantMeta, normalizeQuadrantKey } from "./quadrants";

export function formatDateTimeParts(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return {
    date: date.toLocaleDateString("zh-CN", { month: "long", day: "numeric" }),
    time: date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

type TaskHoverDetailCardProps = {
  task: ScheduleTask;
  /** 日历专注段的起止时间（优先于任务整体排期） */
  segmentStartAt?: string;
  segmentEndAt?: string;
  className?: string;
};

/** 任务详情卡片（用于 hover 浮层内容） */
export function TaskHoverDetailCard({
  task,
  segmentStartAt,
  segmentEndAt,
  className = "",
}: TaskHoverDetailCardProps) {
  const deadline = formatDateTimeParts(task.deadline);
  const segmentStart = formatDateTimeParts(segmentStartAt ?? null);
  const segmentEnd = formatDateTimeParts(segmentEndAt ?? null);
  const meta = getQuadrantMeta(normalizeQuadrantKey(task.category));
  const focusSegments = planPomodoroSegments(task.durationMinutes).filter(
    (segment) => segment.kind === "focus"
  ).length;

  return (
    <div
      className={[
        "rounded-2xl bg-white/98 backdrop-blur-md border border-neutral-200/90 shadow-[0_10px_28px_rgba(15,23,42,0.18)] overflow-hidden",
        className,
      ].join(" ")}
    >
      <div className="px-3 py-2 bg-neutral-50/90 border-b border-neutral-100">
        <p className="text-xs font-bold text-neutral-800 leading-snug line-clamp-3">{task.text}</p>
        {task.scheduledStartAt && task.scheduledEndAt ? (
          <p className="mt-1.5 text-[10px] font-medium text-neutral-500 leading-snug">
            番茄钟 {focusSegments} 段专注（25 分钟/段，段间休息 5 分钟）
          </p>
        ) : null}
      </div>
      {segmentStart && segmentEnd ? (
        <div className="px-3 py-2.5 border-b border-neutral-100 bg-amber-50/80">
          <p className="text-[10px] font-medium text-amber-800/80 leading-none">本段排期</p>
          <p className="mt-1.5 text-sm font-bold text-neutral-900 tabular-nums leading-tight">
            {segmentStart.time}
            <span className="mx-1.5 text-neutral-400 font-semibold">→</span>
            {segmentEnd.time}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-neutral-500">{segmentStart.date}</p>
        </div>
      ) : null}
      <div className="px-3 py-2.5 grid grid-cols-2 gap-2.5">
        <div className="flex gap-2 min-w-0">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <Clock className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-neutral-400 leading-none">预计用时</p>
            <p className="mt-1 text-sm font-semibold text-neutral-800 tabular-nums">
              {task.durationMinutes}
              <span className="text-xs font-medium text-neutral-500 ml-0.5">分钟</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 min-w-0">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <Calendar className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-neutral-400 leading-none">截止时间</p>
            {deadline ? (
              <>
                <p className="mt-1 text-xs font-semibold text-neutral-800 leading-tight">{deadline.date}</p>
                <p className="text-xs font-medium text-neutral-500 tabular-nums">{deadline.time}</p>
              </>
            ) : (
              <p className="mt-1 text-xs font-medium text-neutral-400">未设置</p>
            )}
          </div>
        </div>
      </div>
      <div className="px-3 py-2 border-t border-neutral-100 flex items-center gap-2 bg-white">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <LayoutGrid className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-neutral-400 leading-none">所在象限</p>
          <p className="mt-0.5 text-xs font-semibold text-neutral-800 leading-snug">
            <span className="font-black text-[#1C1917]">{meta.shortTag}</span>
            <span className="mx-1 text-neutral-400">·</span>
            {meta.title}
            <span className="text-neutral-500 font-medium">（{meta.subtitle}）</span>
          </p>
        </div>
      </div>
    </div>
  );
}

type TaskHoverDetailProps = {
  task: ScheduleTask;
};

/** 四象限气泡用：相对定位在触发元素上方 */
export function TaskHoverDetail({ task }: TaskHoverDetailProps) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] z-50 w-[min(100vw-2rem,16rem)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 scale-95 group-hover:scale-100"
      aria-hidden
    >
      <TaskHoverDetailCard task={task} />
      <div className="mx-auto h-2 w-2 rotate-45 bg-white border-r border-b border-neutral-200/90 -mt-1 shadow-sm" />
    </div>
  );
}
