"use client";

import type { ReactNode } from "react";
import { ChevronRight, Coins, ScrollText, Trophy, XCircle } from "lucide-react";
import type { TaskPerformanceReport } from "@/lib/task-performance";
import {
  GameScrollBannerChrome,
  GameScrollParchment,
  GameScrollWoodSeal,
} from "@/components/screens/performance/game-scroll-ui";
import { useI18n } from "@/i18n/i18n-provider";

type MapPerformanceDockProps = {
  report: TaskPerformanceReport | null;
  loading: boolean;
  canEdit: boolean;
  onOpenReport: () => void;
  onRequireLogin: (message: string) => void;
};

export function MapPerformanceDock({
  report,
  loading,
  canEdit,
  onOpenReport,
  onRequireLogin,
}: MapPerformanceDockProps) {
  const { t } = useI18n();

  const handleOpen = () => {
    if (!canEdit) {
      onRequireLogin(t("prompts.performanceReport"));
      return;
    }
    onOpenReport();
  };

  return (
    <div className="shrink-0 z-20 mx-3 sm:mx-5 mb-2 sm:mb-3">
      <button
        type="button"
        onClick={handleOpen}
        className="group w-full text-left transition-transform active:scale-[0.99]"
      >
        <GameScrollBannerChrome>
          <GameScrollParchment>
            <div className="flex flex-col gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <GameScrollWoodSeal>
                  <ScrollText className="h-5 w-5" />
                </GameScrollWoodSeal>

                <div className="min-w-0 flex-1">
                  <p className="font-bangers text-xl sm:text-2xl text-[#2d1a0a] tracking-wide leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.2)]">
                    {t("performance.scrollTitle")}
                  </p>
                  <p className="mt-0.5 font-comic text-xs sm:text-sm font-bold text-[#3d2810]/80 truncate">
                    {canEdit ? t("performance.hintCanEdit") : t("performance.hintGuest")}
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <StatOrb
                    icon={<Trophy className="h-4 w-4" />}
                    label={t("performance.wins")}
                    value={loading ? "…" : String(report?.successCount ?? 0)}
                    tone="emerald"
                  />
                  <StatOrb
                    icon={<XCircle className="h-4 w-4" />}
                    label={t("performance.losses")}
                    value={loading ? "…" : String(report?.failureCount ?? 0)}
                    tone="rose"
                  />
                  <StatOrb
                    icon={<Coins className="h-4 w-4" />}
                    label={t("performance.coins")}
                    value={loading ? "…" : String(report?.totalCoins ?? 0)}
                    tone="amber"
                  />
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-amber-900/70 group-hover:translate-x-0.5 transition-transform" />
              </div>

              <div className="flex sm:hidden items-center justify-center gap-2 pt-0.5">
                <StatOrb
                  icon={<Trophy className="h-3.5 w-3.5" />}
                  label="通关"
                  value={loading ? "…" : String(report?.successCount ?? 0)}
                  tone="emerald"
                  compact
                />
                <StatOrb
                  icon={<XCircle className="h-3.5 w-3.5" />}
                  label="战败"
                  value={loading ? "…" : String(report?.failureCount ?? 0)}
                  tone="rose"
                  compact
                />
                <StatOrb
                  icon={<Coins className="h-3.5 w-3.5" />}
                  label="币"
                  value={loading ? "…" : String(report?.totalCoins ?? 0)}
                  tone="amber"
                  compact
                />
              </div>
            </div>
          </GameScrollParchment>
        </GameScrollBannerChrome>
      </button>
    </div>
  );
}

function StatOrb({
  icon,
  label,
  value,
  tone,
  compact = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "emerald" | "rose" | "amber";
  compact?: boolean;
}) {
  const bg =
    tone === "emerald"
      ? "bg-emerald-600/90"
      : tone === "rose"
        ? "bg-rose-700/90"
        : "bg-amber-600/90";

  return (
    <div
      className={[
        "flex items-center gap-1 rounded-lg border-2 border-[#1C1917] text-white shadow-[0_2px_0_#1C1917]",
        bg,
        compact ? "px-2.5 py-1" : "px-3 py-1.5",
      ].join(" ")}
    >
      {icon}
      <span
        className={[
          "font-bangers leading-none tracking-wide",
          compact ? "text-lg" : "text-xl",
        ].join(" ")}
      >
        {label} {value}
      </span>
    </div>
  );
}
