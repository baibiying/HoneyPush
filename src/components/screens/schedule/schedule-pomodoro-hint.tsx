"use client";

import {
  POMODORO_BREAK_MINUTES,
  POMODORO_FOCUS_MINUTES,
} from "@/lib/ai/schedule-times";
import { useI18n } from "@/i18n/i18n-provider";

type SchedulePomodoroHintProps = {
  /** 深色磨砂背景上的横幅（AI 排期日历页） */
  variant?: "banner" | "bannerLight" | "header" | "panel" | "empty";
  className?: string;
};

const VARIANT_CLASS: Record<NonNullable<SchedulePomodoroHintProps["variant"]>, string> = {
  banner: [
    "shrink-0 mb-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl",
    "border-2 border-amber-300/70 bg-gradient-to-r from-amber-500/35 via-orange-500/25 to-amber-500/30",
    "text-sm sm:text-base font-black text-amber-50 leading-relaxed text-center",
    "shadow-[0_3px_0_rgba(0,0,0,0.25)]",
  ].join(" "),
  bannerLight: [
    "shrink-0 mb-3 px-3 sm:px-4 py-3 rounded-xl",
    "border-2 border-[#1C1917] bg-amber-100",
    "text-sm sm:text-base font-black text-[#1C1917] leading-relaxed text-center",
    "comic-shadow-sm",
  ].join(" "),
  header: [
    "mt-1 text-sm sm:text-base font-black text-amber-50 leading-snug",
    "drop-shadow-[0_1px_0_#1C1917]",
  ].join(" "),
  panel: [
    "mt-4 px-4 py-3.5 rounded-xl border-2 border-amber-300/60",
    "bg-gradient-to-r from-amber-500/30 to-fuchsia-500/20",
    "text-base sm:text-lg font-black text-amber-50 leading-relaxed text-center",
    "shadow-[0_2px_0_rgba(0,0,0,0.2)]",
  ].join(" "),
  empty: [
    "mt-4 px-4 py-3 rounded-xl border-2 border-amber-300/55 bg-amber-500/25",
    "text-sm sm:text-base font-black text-amber-50 leading-relaxed max-w-md mx-auto",
  ].join(" "),
};

export function SchedulePomodoroHint({
  variant = "banner",
  className = "",
}: SchedulePomodoroHintProps) {
  const { t } = useI18n();

  return (
    <p className={[VARIANT_CLASS[variant], className].filter(Boolean).join(" ")}>
      {t("calendar.pomodoroHint", {
        focus: POMODORO_FOCUS_MINUTES,
        break: POMODORO_BREAK_MINUTES,
      })}
    </p>
  );
}
