"use client";

import { useCallback, useRef, useState } from "react";
import { Download, Check } from "lucide-react";
import type { SupervisionOutcomeStats } from "@/lib/supervision-outcome";
import { SUPERVISION_MAX_STRIKES } from "@/lib/supervision-blocks";
import { useI18n } from "@/i18n/i18n-provider";

type FocusShareCardProps = {
  stats: SupervisionOutcomeStats;
  totalFocusMinutes: number;
  onClose: () => void;
};

export function FocusShareCard({ stats, totalFocusMinutes, onClose }: FocusShareCardProps) {
  const { t } = useI18n();
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const handleExport = useCallback(async () => {
    if (!cardRef.current || exporting) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `honeypush-${stats.taskText.slice(0, 20)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    } catch {
      // fallback: ignore
    } finally {
      setExporting(false);
    }
  }, [exporting, stats.taskText]);

  const stars = stats.starsEarnedCumulative;
  const maxStars = stats.totalBlocks * SUPERVISION_MAX_STRIKES;

  return (
    <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Capturable card */}
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-2xl border-[3px] border-amber-400/80 bg-gradient-to-br from-amber-950 via-stone-900 to-indigo-950 p-6 sm:p-8"
        >
          {/* Decorative background */}
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, rgba(251,191,36,0.5), transparent 50%), radial-gradient(circle at 80% 70%, rgba(99,102,241,0.4), transparent 50%)",
            }}
          />

          {/* Brand header */}
          <div className="relative flex items-center justify-between mb-4">
            <div>
              <p className="font-bangers text-2xl sm:text-3xl text-amber-300 tracking-wider drop-shadow-[0_2px_0_#1C1917]">
                HoneyPush
              </p>
              <p className="text-xs sm:text-sm font-bold text-amber-200/70 tracking-wide">
                {t("shareCard.tagline")}
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border-2 border-amber-400/50 bg-amber-500/20 px-3 py-1.5">
              <span className="text-lg">🏆</span>
              <span className="font-bangers text-xl text-amber-300">
                {t("shareCard.cleared")}
              </span>
            </div>
          </div>

          {/* Task name */}
          <div className="relative rounded-xl border-2 border-white/15 bg-black/30 px-4 py-3 mb-5">
            <p className="text-xs font-black uppercase tracking-widest text-amber-200/70 mb-1">
              {t("shareCard.mission")}
            </p>
            <p className="font-bangers text-2xl sm:text-3xl text-white tracking-wide leading-tight">
              {stats.taskText}
            </p>
          </div>

          {/* Stats grid */}
          <div className="relative grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl border-2 border-amber-400/30 bg-gradient-to-b from-amber-500/20 to-transparent px-4 py-3 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-200/80">
                {t("shareCard.focusTime")}
              </p>
              <p className="font-bangers text-3xl text-amber-300 mt-1">
                {totalFocusMinutes}<span className="text-lg ml-1">{t("shareCard.minutes")}</span>
              </p>
            </div>
            <div className="rounded-xl border-2 border-emerald-400/30 bg-gradient-to-b from-emerald-500/20 to-transparent px-4 py-3 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-200/80">
                {t("shareCard.stars")}
              </p>
              <p className="font-bangers text-3xl text-emerald-300 mt-1">
                {stars}<span className="text-lg ml-1 opacity-70">/{maxStars}</span>
              </p>
            </div>
            <div className="rounded-xl border-2 border-rose-400/30 bg-gradient-to-b from-rose-500/20 to-transparent px-4 py-3 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-rose-200/80">
                {t("shareCard.slacking")}
              </p>
              <p className="font-bangers text-3xl text-rose-300 mt-1">
                {stats.distractionsCumulative}<span className="text-lg ml-1">{t("shareCard.times")}</span>
              </p>
            </div>
            <div className="rounded-xl border-2 border-amber-400/30 bg-gradient-to-b from-amber-500/20 to-transparent px-4 py-3 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-200/80">
                {t("shareCard.coins")}
              </p>
              <p className="font-bangers text-3xl text-amber-300 mt-1">
                +{stats.coinsEarned ?? 0}
              </p>
            </div>
          </div>

          {/* Officer badge */}
          <div className="relative flex items-center gap-3 rounded-xl border-2 border-violet-400/30 bg-violet-500/15 px-4 py-2.5">
            <span className="text-2xl">👮</span>
            <div>
              <p className="text-xs font-bold text-violet-200/80">{t("shareCard.officer")}</p>
              <p className="font-bangers text-lg text-violet-200">{stats.officerName}</p>
            </div>
          </div>

          {/* Bottom branding */}
          <p className="relative mt-5 text-center text-xs font-bold text-white/30 tracking-wider">
            honeypush.app · {t("shareCard.footer")}
          </p>
        </div>

        {/* Action buttons (NOT inside the captured card) */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border-2 border-white/20 bg-white/10 px-4 py-3 font-comic text-base font-bold text-white/80 hover:bg-white/20 transition-colors"
          >
            {t("common.close")}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className={[
              "flex-1 flex items-center justify-center gap-2 rounded-xl border-[3px] border-amber-500 px-4 py-3 font-bangers text-lg tracking-wider transition-transform hover:scale-[1.02] active:scale-[0.98]",
              exported
                ? "bg-gradient-to-b from-emerald-400 to-emerald-700 text-white"
                : "bg-gradient-to-b from-amber-400 to-amber-700 text-white",
            ].join(" ")}
          >
            {exported ? (
              <><Check className="h-5 w-5" /> {t("shareCard.saved")}</>
            ) : (
              <><Download className="h-5 w-5" /> {t("shareCard.saveImage")}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
