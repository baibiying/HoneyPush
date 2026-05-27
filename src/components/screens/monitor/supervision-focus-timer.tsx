"use client";

import { formatCountdownSeconds } from "@/lib/supervision-blocks";
import { useI18n } from "@/i18n/i18n-provider";

type SupervisionFocusTimerProps = {
  totalSeconds: number;
  remainingSeconds: number;
  blockLabel?: string;
};

export function SupervisionFocusTimer({
  totalSeconds,
  remainingSeconds,
  blockLabel,
}: SupervisionFocusTimerProps) {
  const { t } = useI18n();
  const total = Math.max(1, totalSeconds);
  const remaining = Math.max(0, Math.min(total, remainingSeconds));
  const elapsed = total - remaining;
  const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const remainingLabel = formatCountdownSeconds(remaining);

  return (
    <div
      className={[
        "rounded-xl border-[3px] border-[#1C1917] bg-black/80 backdrop-blur-md",
        "px-4 py-3 sm:px-5 sm:py-4 comic-shadow-lg",
        "w-[min(100%,280px)] sm:w-[320px] md:w-[360px]",
      ].join(" ")}
      role="timer"
      aria-live="polite"
      aria-label={t("monitor.focusTimer.ariaRemaining", { time: remainingLabel })}
    >
      {blockLabel && (
        <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-300/95 truncate">
          {blockLabel}
        </p>
      )}
      <div className="mt-1 flex items-end justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-[10px] sm:text-xs font-mono text-stone-400 uppercase tracking-wide">
            {t("monitor.focusTimer.remaining")}
          </p>
          <p className="font-bangers text-4xl sm:text-5xl md:text-6xl leading-none tabular-nums text-emerald-300 tracking-wide drop-shadow-[0_2px_0_#1c1917]">
            {remainingLabel}
          </p>
        </div>
        <div className="text-right shrink-0 pb-0.5">
          <p className="text-[10px] sm:text-xs font-mono text-stone-400 uppercase tracking-wide">
            {t("monitor.focusTimer.elapsed")}
          </p>
          <p className="font-mono text-lg sm:text-xl md:text-2xl font-bold tabular-nums text-stone-100">
            {formatCountdownSeconds(elapsed)}
          </p>
        </div>
      </div>
      <div className="mt-2.5 h-2 sm:h-2.5 rounded-full bg-stone-800 border-2 border-stone-600 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-[10px] sm:text-xs font-mono text-stone-500 tabular-nums text-center">
        {t("monitor.focusTimer.blockTotal", { time: formatCountdownSeconds(total) })}
      </p>
    </div>
  );
}
