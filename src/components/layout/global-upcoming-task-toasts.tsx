"use client";

import { Bell, Clock, Lightbulb, Swords, X } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useGlobalUpcomingTaskReminders } from "@/hooks/use-global-upcoming-task-reminders";
import { useSupervisionTakeover } from "@/hooks/use-supervision-takeover";
import { useI18n } from "@/i18n/i18n-provider";
import {
  FROSTED_PANEL,
  ScheduleHubBackground,
} from "@/components/screens/schedule/task-form-shared";
import {
  TASK_REMINDER_LEAD_MINUTES,
  formatMinutesUntilStartLocalized,
  type ScheduledTaskLike,
} from "@/lib/schedule-execution";

function formatStartTime(iso: string, dateLocale: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(dateLocale, {
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
  const { t, locale } = useI18n();
  const dateLocale = locale === "zh" ? "zh-CN" : "en-US";
  const countdown = formatMinutesUntilStartLocalized(task, t, now);
  const startLabel = task.scheduledStartAt ? formatStartTime(task.scheduledStartAt, dateLocale) : null;

  return (
    <div className="pointer-events-auto relative">
      <div
        className="absolute -inset-1 rounded-[1.1rem] bg-gradient-to-r from-amber-400/50 via-orange-400/40 to-amber-500/50 blur-sm animate-pulse"
        aria-hidden
      />

      <article
        className="relative animate-[fadeIn_0.25s_ease-out] overflow-hidden rounded-2xl border-[3px] border-amber-400/90 bg-[#1C1917] comic-shadow ring-2 ring-amber-300/40 ring-offset-2 ring-offset-transparent"
        role="alert"
        aria-labelledby={`task-reminder-title-${task.id}`}
      >
        <ScheduleHubBackground />

        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-300 via-orange-400 to-amber-500 z-10"
          aria-hidden
        />

        <div className={`relative ${FROSTED_PANEL} border-0 pl-1`}>
          <div className="flex items-center gap-2 border-b-2 border-amber-400/30 bg-gradient-to-r from-amber-500/35 via-orange-500/25 to-transparent px-4 py-2">
            <Bell className="h-4 w-4 shrink-0 text-amber-200 animate-pulse" strokeWidth={2.5} aria-hidden />
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-100">
              {t("reminder.badge")}
            </span>
            <span className="ml-auto flex h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-ping" aria-hidden />
          </div>

          <header className="flex items-start gap-3 border-b-2 border-white/15 px-4 py-3">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-gradient-to-br from-amber-400 to-orange-500 text-[#1C1917] shadow-[0_3px_0_#c2410c]">
              <Swords className="h-5 w-5" strokeWidth={2.5} aria-hidden />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#1C1917] bg-rose-500 text-[9px] font-black text-white">
                !
              </span>
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="font-bangers text-lg tracking-wide text-white drop-shadow-[0_2px_0_#1C1917] leading-none">
                {t("reminder.title")}
              </p>
              <p className="mt-1 text-xs font-bold text-amber-200/90">{t("reminder.subtitle")}</p>
            </div>
            <button
              type="button"
              onClick={() => onSnooze(task)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-[#1C1917] bg-white/95 text-[#1C1917] shadow-[0_2px_0_#1C1917] transition-all hover:bg-amber-100 active:translate-y-0.5 active:shadow-none"
              aria-label={t("reminder.closeSnooze")}
            >
              <X className="h-4 w-4" strokeWidth={3} />
            </button>
          </header>

          <div className="space-y-3 px-4 py-3.5">
            <div className="rounded-lg border border-white/15 bg-black/20 px-2.5 py-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200/80">
                {t("reminder.currentTask")}
              </p>
              <h2
                id={`task-reminder-title-${task.id}`}
                className="mt-0.5 font-bangers text-xl sm:text-[1.35rem] leading-snug text-amber-50 drop-shadow-[0_1px_0_#1C1917] line-clamp-3"
              >
                {task.text}
              </h2>
            </div>

            <div
              className="rounded-xl border-2 border-amber-400/80 bg-gradient-to-br from-amber-500/30 via-orange-500/20 to-amber-600/10 px-3 py-3 shadow-[inset_0_0_20px_rgba(251,191,36,0.12)] ring-1 ring-amber-300/30"
              role="status"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Clock className="h-4 w-4 shrink-0 text-amber-200 animate-pulse" strokeWidth={2.5} aria-hidden />
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-100">
                  {t("reminder.countdown")}
                </span>
              </div>
              <p className="font-bangers text-2xl sm:text-[1.65rem] tracking-wide text-amber-50 drop-shadow-[0_2px_0_#1C1917] leading-tight">
                {countdown}
              </p>
              {startLabel ? (
                <p className="mt-1.5 text-xs font-bold text-amber-100/90 tabular-nums flex items-center gap-1.5">
                  <span className="inline-block h-1 w-1 rounded-full bg-amber-300" aria-hidden />
                  {t("reminder.scheduledStart", { time: startLabel })}
                </p>
              ) : null}
            </div>

            <div className="flex gap-2.5 rounded-lg border border-dashed border-amber-400/40 bg-amber-500/10 px-3 py-2.5">
              <Lightbulb
                className="h-5 w-5 shrink-0 text-amber-300 mt-0.5"
                strokeWidth={2.5}
                aria-hidden
              />
              <p className="text-sm sm:text-base font-bold leading-relaxed text-amber-50">
                {t("reminder.tip", { minutes: TASK_REMINDER_LEAD_MINUTES })}
              </p>
            </div>
          </div>

          <footer className="border-t-2 border-white/15 bg-black/15 px-4 py-3">
            <button
              type="button"
              onClick={() => onDismissPermanent(task)}
              className="w-full rounded-xl border-2 border-[#1C1917] bg-white/95 py-2.5 text-sm font-bold text-[#1C1917] comic-shadow-sm transition-all hover:bg-amber-50 active:translate-y-0.5 active:shadow-none"
            >
              {t("reminder.dismissPermanent")}
            </button>
          </footer>
        </div>
      </article>
    </div>
  );
}

/** 全站右上角：排期开始前 30 分钟的任务提醒 */
export function GlobalUpcomingTaskToasts() {
  const { user, loading: authLoading } = useAuth();
  const { active: takeoverActive } = useSupervisionTakeover();
  const { now, upcoming, snooze, dismissPermanent } = useGlobalUpcomingTaskReminders({
    enabled: Boolean(user) && !authLoading,
  });

  if (!user || takeoverActive || upcoming.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed top-[60px] right-3 z-[180] flex w-[min(calc(100vw-1.5rem),21rem)] flex-col gap-4 sm:right-6 sm:w-[23rem]"
      aria-live="assertive"
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
