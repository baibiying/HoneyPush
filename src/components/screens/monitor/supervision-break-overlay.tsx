"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Coffee, Hourglass, Swords, Sparkles } from "lucide-react";
import {
  SUPERVISION_BREAK_SECONDS,
  formatCountdownSeconds,
} from "@/lib/supervision-blocks";
import { useI18n } from "@/i18n/i18n-provider";
import {
  formatBlockLabelLocalized,
  formatBlockStartTimeLocalized,
  formatBreakDurationHintLocalized,
} from "@/lib/monitor-i18n";

type SupervisionBreakOverlayProps = {
  nextBlockIndex: number;
  totalBlocks: number;
  nextBlockStartAt: string;
  secondsRemaining: number;
  taskText?: string;
};

export function SupervisionBreakOverlay({
  nextBlockIndex,
  totalBlocks,
  nextBlockStartAt,
  secondsRemaining,
  taskText,
}: SupervisionBreakOverlayProps) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "zh" ? "zh-CN" : "en-US";

  const nextBlockLabel = useMemo(
    () => formatBlockLabelLocalized(nextBlockIndex, totalBlocks, t),
    [nextBlockIndex, totalBlocks, t, locale]
  );
  const nextBlockStartLabel = useMemo(
    () => formatBlockStartTimeLocalized(nextBlockStartAt, dateLocale),
    [nextBlockStartAt, dateLocale]
  );

  const canStart = secondsRemaining <= 0;
  const breakTotal = Math.max(1, SUPERVISION_BREAK_SECONDS);
  const elapsed = Math.max(0, breakTotal - secondsRemaining);
  const progress = Math.min(100, (elapsed / breakTotal) * 100);
  const breakHint = formatBreakDurationHintLocalized(breakTotal, t);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10045] flex flex-col overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label={t("monitor.break.ariaLabel")}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(251,191,36,0.4), transparent)",
            "radial-gradient(ellipse 55% 35% at 15% 100%, rgba(56,189,248,0.2), transparent)",
            "radial-gradient(white 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "100% 100%, 100% 100%, 22px 22px",
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-amber-950 via-[#1a1028] to-indigo-950"
        aria-hidden
      />

      <header className="relative shrink-0 border-b-4 border-[#1C1917] bg-gradient-to-r from-amber-500 via-orange-600 to-amber-900 px-6 py-6 sm:py-8">
        <div className="mx-auto flex max-w-4xl items-center gap-4 sm:gap-6">
          <span className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl border-[3px] border-[#1C1917] bg-black/30 comic-shadow">
            <Coffee className="h-9 w-9 sm:h-11 sm:w-11 text-amber-100" strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <h1 className="font-bangers text-4xl sm:text-5xl md:text-6xl text-white tracking-wide leading-none drop-shadow-[0_3px_0_#1C1917]">
              {t("monitor.break.title")}
              <Sparkles className="inline h-8 w-8 sm:h-10 sm:w-10 text-amber-200 ml-2 align-middle" />
            </h1>
            <p className="mt-2 text-lg sm:text-xl md:text-2xl font-bold text-amber-50/95 leading-snug max-w-2xl">
              {t("monitor.break.subtitle", { duration: breakHint })}
            </p>
          </div>
        </div>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-3xl space-y-8 sm:space-y-10">
          {taskText && (
            <div className="rounded-2xl border-[3px] border-[#1C1917] bg-black/35 backdrop-blur-md px-5 py-4 sm:px-6 sm:py-5 comic-shadow-lg text-center border-amber-400/35">
              <p className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-amber-200/70">
                {t("monitor.currentTask")}
              </p>
              <p className="mt-1 font-bangers text-2xl sm:text-3xl md:text-4xl text-white tracking-wide leading-tight">
                {taskText}
              </p>
            </div>
          )}

          <div className="rounded-2xl border-[3px] border-[#1C1917] bg-black/40 backdrop-blur-md px-6 py-8 sm:px-10 sm:py-12 comic-shadow-lg text-center border-amber-300/40">
            <p className="text-sm sm:text-base font-black uppercase tracking-[0.25em] text-amber-200/80">
              {t("monitor.break.countdown")}
            </p>
            <p
              className={[
                "mt-3 font-bangers tabular-nums tracking-wide drop-shadow-[0_4px_0_#1C1917]",
                canStart
                  ? "text-6xl sm:text-7xl md:text-8xl text-emerald-300 animate-pulse"
                  : "text-7xl sm:text-8xl md:text-9xl text-amber-300",
              ].join(" ")}
            >
              {canStart ? t("monitor.break.battleReady") : formatCountdownSeconds(secondsRemaining)}
            </p>
            <div className="mx-auto mt-6 h-3 sm:h-4 max-w-md rounded-full border-2 border-stone-600 bg-stone-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 transition-[width] duration-1000 ease-linear"
                style={{ width: `${canStart ? 100 : progress}%` }}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-sky-400/50 bg-gradient-to-b from-sky-500/30 to-indigo-900/40 px-5 py-4 text-center">
              <div className="flex items-center justify-center gap-2 text-sky-200/90 mb-2">
                <Hourglass className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-widest">
                  {t("monitor.break.nextBlock")}
                </span>
              </div>
              <p className="font-bangers text-2xl sm:text-3xl text-white tracking-wide">
                {nextBlockLabel}
              </p>
            </div>
            <div className="rounded-xl border-2 border-amber-400/50 bg-gradient-to-b from-amber-500/30 to-orange-900/40 px-5 py-4 text-center">
              <div className="flex items-center justify-center gap-2 text-amber-200/90 mb-2">
                <Swords className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-widest">
                  {t("monitor.break.battleTime")}
                </span>
              </div>
              <p className="font-bangers text-2xl sm:text-3xl text-white tracking-wide tabular-nums">
                {canStart ? t("monitor.break.startingSoon") : nextBlockStartLabel}
              </p>
            </div>
          </div>

          <p className="text-center text-base sm:text-lg font-bold text-violet-200/90">
            {canStart
              ? t("monitor.break.loadingNext", { label: nextBlockLabel })
              : t("monitor.break.autoStart", {
                  label: nextBlockLabel,
                  time: nextBlockStartLabel,
                })}
          </p>
        </div>
      </main>

      <footer className="relative shrink-0 border-t-4 border-[#1C1917] bg-black/50 px-4 py-4 sm:py-5 backdrop-blur-md">
        <p className="text-center font-mono text-sm sm:text-base font-bold text-amber-200/70 tracking-wide">
          {t("monitor.break.footer")}
        </p>
      </footer>
    </motion.div>
  );
}
