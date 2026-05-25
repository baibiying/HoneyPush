"use client";

import { Bell, Swords, X } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useGlobalUpcomingTaskReminders } from "@/hooks/use-global-upcoming-task-reminders";
import {
  TASK_REMINDER_LEAD_MINUTES,
  formatMinutesUntilStart,
  type ScheduledTaskLike,
} from "@/lib/schedule-execution";

function formatStartTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function UpcomingTaskToast({
  task,
  now,
  onSnooze,
  onDismissPermanent,
}: {
  task: ScheduledTaskLike;
  now: Date;
  onSnooze: (task: ScheduledTaskLike) => void;
  onDismissPermanent: (task: ScheduledTaskLike) => void;
}) {
  return (
    <div
      className="pointer-events-auto relative overflow-hidden rounded-2xl border-[3px] border-[#1C1917] bg-[#FFFBF0] comic-shadow animate-[fadeIn_0.25s_ease-out]"
      role="alert"
    >
      {/* 游戏 HUD 顶栏 */}
      <div className="relative flex items-start gap-3 border-b-[3px] border-[#1C1917] bg-gradient-to-r from-violet-600 via-fuchsia-600 to-[#F15A24] px-4 py-3">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, white 0%, transparent 45%), radial-gradient(white 1px, transparent 1px)",
            backgroundSize: "auto, 12px 12px",
          }}
          aria-hidden
        />
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-amber-300 text-[#1C1917] shadow-[0_3px_0_#c97a0a]">
          <Swords className="h-6 w-6" strokeWidth={2.5} />
        </span>
        <div className="relative min-w-0 flex-1 pt-0.5">
          <p className="font-bangers text-lg sm:text-xl tracking-wide text-white drop-shadow-[0_2px_0_#1C1917] leading-none">
            任务即将开始
          </p>
          <p className="mt-1.5 text-sm sm:text-base font-black text-amber-50 leading-snug line-clamp-2 drop-shadow-[0_1px_0_#1C1917]">
            {task.text}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSnooze(task)}
          className="relative shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border-2 border-[#1C1917] bg-white/95 text-[#1C1917] shadow-[0_2px_0_#1C1917] hover:bg-amber-100 active:translate-y-0.5 active:shadow-none transition-all"
          aria-label="关闭，1 分钟后再次提醒"
        >
          <X className="h-5 w-5" strokeWidth={3} />
        </button>
      </div>

      {/* 内容区 */}
      <div className="px-4 py-3.5 space-y-3 bg-gradient-to-b from-amber-50/90 to-[#FFFBF0]">
        <div className="flex items-center gap-2 rounded-xl border-2 border-[#1C1917] bg-white px-3 py-2.5 comic-shadow-sm">
          <Bell className="h-5 w-5 shrink-0 text-amber-600" strokeWidth={2.5} />
          <p className="text-base sm:text-lg font-black text-[#1C1917] leading-snug">
            {formatMinutesUntilStart(task, now)}
          </p>
        </div>

        {task.scheduledStartAt ? (
          <p className="text-sm sm:text-base font-bold text-neutral-700 leading-relaxed px-0.5">
            <span className="font-bangers text-base text-violet-700 tracking-wide">开始时间</span>
            <span className="ml-2 tabular-nums text-[#1C1917]">
              {formatStartTime(task.scheduledStartAt)}
            </span>
            <span className="block mt-1 text-xs sm:text-sm font-semibold text-neutral-500">
              提前 {TASK_REMINDER_LEAD_MINUTES} 分钟提醒 · 到点将自动进入监督流程
            </span>
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => onDismissPermanent(task)}
          className="w-full rounded-xl border-2 border-[#1C1917] bg-white px-4 py-2.5 text-sm sm:text-base font-black text-neutral-700 comic-shadow-sm hover:bg-amber-50 comic-btn-push active:translate-y-0.5 active:shadow-none transition-all"
        >
          不再提醒
        </button>
      </div>

      {/* 右下角关卡角标 */}
      <span
        className="absolute bottom-2 left-2 font-bangers text-[10px] sm:text-xs tracking-widest text-violet-400/80 select-none pointer-events-none"
        aria-hidden
      >
        QUEST ALERT
      </span>
    </div>
  );
}

/** 全站右上角：排期开始前 30 分钟的任务提醒 */
export function GlobalUpcomingTaskToasts() {
  const { user, loading: authLoading } = useAuth();
  const { now, upcoming, snooze, dismissPermanent } = useGlobalUpcomingTaskReminders({
    enabled: Boolean(user) && !authLoading,
  });

  if (!user || upcoming.length === 0) return null;

  return (
    <div
      className="fixed top-[60px] md:top-[96px] right-3 md:right-6 z-[180] flex flex-col gap-3 w-[min(calc(100vw-1.5rem),22rem)] sm:w-[24rem] pointer-events-none"
      aria-live="polite"
    >
      {upcoming.map((task) => (
        <UpcomingTaskToast
          key={`${task.id}-${task.scheduledStartAt}`}
          task={task}
          now={now}
          onSnooze={snooze}
          onDismissPermanent={dismissPermanent}
        />
      ))}
    </div>
  );
}
