"use client";

import { Bell } from "lucide-react";
import {
  formatMinutesUntilStart,
  type ScheduledTaskLike,
} from "@/lib/schedule-execution";

type ScheduleExecutionAlertsProps = {
  upcoming: ScheduledTaskLike[];
  active: ScheduledTaskLike[];
  now?: Date;
  className?: string;
};

export function ScheduleExecutionAlerts({
  upcoming,
  active,
  now = new Date(),
  className = "",
}: ScheduleExecutionAlertsProps) {
  if (upcoming.length === 0 && active.length === 0) return null;

  return (
    <div
      className={[
        "rounded-xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-fuchsia-600/20 backdrop-blur-sm px-3 py-2.5 sm:px-4 sm:py-3 space-y-2",
        className,
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-amber-50">
        <Bell className="h-4 w-4 shrink-0 animate-pulse" />
        <p className="text-xs sm:text-sm font-bold">执行提醒</p>
      </div>

      {upcoming.map((task) => (
        <div
          key={`upcoming-${task.id}-${task.scheduledStartAt}`}
          className="flex items-start justify-between gap-2 rounded-lg bg-black/25 border border-white/15 px-2.5 py-2"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-amber-200/90 uppercase tracking-wide">
              即将开始
            </p>
            <p className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2">
              {task.text}
            </p>
            <p className="text-[10px] text-amber-100/80 mt-0.5">
              {formatMinutesUntilStart(task, now)}
            </p>
          </div>
        </div>
      ))}

      {active.map((task) => (
        <div
          key={`active-${task.id}-${task.scheduledStartAt}`}
          className="flex items-start gap-2 rounded-lg bg-emerald-950/50 border border-emerald-400/40 px-2.5 py-2"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-emerald-200/90 uppercase tracking-wide">
              已到开始时间
            </p>
            <p className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2">
              {task.text}
            </p>
            <p className="text-[10px] text-emerald-100/85 mt-0.5">
              将自动进入监督视窗并开启摄像头；若未在地图上选定监督官，需先选择一次
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
