"use client";

import type { ReactNode } from "react";
import { Coins, LogIn, LogOut, Scroll, UserPlus } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { usePlayerStats } from "@/hooks/use-player-stats";
import { GameScrollWoodSeal } from "@/components/screens/performance/game-scroll-ui";
import { useI18n } from "@/i18n/i18n-provider";

/** 首页地图：游客通行证 / 已登录指挥官状态 */
export function HomeCommanderDock() {
  const { t } = useI18n();
  const { user, loading: authLoading, openAuthModal, logout } = useAuth();
  const { totalCoins } = usePlayerStats();

  if (authLoading) {
    return (
      <div
        className="w-full sm:w-[min(100%,440px)] h-[4.25rem] rounded-lg border-2 border-white/20 bg-black/25 animate-pulse"
        aria-hidden
      />
    );
  }

  if (!user) {
    return (
      <div className="w-full sm:max-w-[440px] shrink-0">
        <div
          className={[
            "relative overflow-hidden rounded-lg border-2 border-[#1C1917]",
            "bg-gradient-to-br from-amber-100 via-[#FFF8E7] to-amber-200/90",
            "shadow-[0_4px_0_#1C1917,0_8px_20px_rgba(0,0,0,0.3)]",
            "px-3 py-2.5 sm:px-3.5 sm:py-3",
          ].join(" ")}
        >
          <div className="relative flex items-center gap-2.5 sm:gap-3">
            <GameScrollWoodSeal>
              <Scroll className="h-4 w-4 sm:h-5 sm:w-5" />
            </GameScrollWoodSeal>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <BasePassGameTitle />
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => openAuthModal("login")}
                    className={[
                      "inline-flex items-center gap-1.5 rounded-md border-2 border-[#1C1917]",
                      "bg-[#1C1917] px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm sm:text-base font-bold text-amber-100",
                      "shadow-[0_2px_0_#1C1917] hover:bg-black active:translate-y-px",
                    ].join(" ")}
                  >
                    <LogIn className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />
                    {t("dock.login")}
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal("register")}
                    className={[
                      "inline-flex items-center gap-1.5 rounded-md border-2 border-[#1C1917]",
                      "bg-gradient-to-b from-orange-400 to-orange-600 px-2.5 py-1.5 sm:px-3 sm:py-2",
                      "text-sm sm:text-base font-bold text-white",
                      "shadow-[0_2px_0_#1C1917] hover:from-orange-300 hover:to-orange-500 active:translate-y-px",
                    ].join(" ")}
                  >
                    <UserPlus className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />
                    {t("dock.register")}
                  </button>
                </div>
              </div>
              <p className="mt-1 font-comic text-sm sm:text-base font-bold text-[#3d2810]/80 leading-tight line-clamp-1">
                {t("dock.guestHint")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayName = user.name || user.email || t("dock.commander");

  return (
    <div className="w-fit max-w-full shrink-0">
      <div
        className={[
          "rounded-xl border-[3px] border-[#1C1917] bg-[#FFF8E7]/95 backdrop-blur-sm",
          "shadow-[0_4px_0_#1C1917,0_10px_24px_rgba(0,0,0,0.28)]",
          "px-3 py-2.5 sm:px-3.5 sm:py-3",
        ].join(" ")}
      >
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <span
            className={[
              "flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg",
              "border-2 border-[#1C1917] bg-gradient-to-br from-emerald-500 to-teal-700",
              "text-sm sm:text-base font-bangers text-white shadow-[0_2px_0_#1C1917]",
            ].join(" ")}
            title={t("dock.online")}
          >
            ✓
          </span>

          <div className="flex shrink-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="font-bangers text-xl sm:text-2xl text-[#1C1917] tracking-wide leading-none whitespace-nowrap">
              {displayName}
            </p>
            <p className="text-sm sm:text-base font-bold text-emerald-800/85 leading-none whitespace-nowrap">
              {t("dock.syncing")}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <StatPill
              icon={<Coins className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />}
              label={t("dock.coins")}
              value={String(totalCoins)}
            />
            <button
              type="button"
              onClick={() => void logout()}
              className={[
                "inline-flex items-center gap-1.5 rounded-lg border-2 border-[#1C1917]",
                "bg-rose-100 px-2.5 py-1.5 sm:px-3 sm:py-2",
                "text-base sm:text-lg font-bold text-[#1C1917]",
                "shadow-[0_2px_0_#1C1917] hover:bg-rose-200",
                "active:translate-y-px",
              ].join(" ")}
            >
              <LogOut className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />
              {t("dock.logout")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 漫画风标题：木牌徽章 + 双色 Bangers 描边阴影 */
function BasePassGameTitle() {
  const { t } = useI18n();

  return (
    <div className="relative inline-flex shrink-0">
      <span
        className={[
          "pointer-events-none absolute -bottom-0.5 left-0.5 right-0.5 h-full rounded-md",
          "bg-[#1C1917] opacity-90",
        ].join(" ")}
        aria-hidden
      />
      <span
        className={[
          "relative inline-flex items-center rounded-md border-2 border-[#1C1917]",
          "bg-gradient-to-b from-amber-200 via-amber-400 to-orange-500",
          "px-2 py-0.5 sm:px-2.5 sm:py-1",
          "shadow-[0_3px_0_#1C1917,inset_0_1px_0_rgba(255,255,255,0.5)]",
        ].join(" ")}
      >
        <span className="font-bangers text-xl sm:text-2xl tracking-wide leading-none">
          <span className="text-orange-800 drop-shadow-[0_2px_0_#1C1917]">
            {t("dock.basePassPart1")}
          </span>
          <span className="text-[#1C1917] drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]">
            {t("dock.basePassPart2")}
          </span>
        </span>
      </span>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className={[
        "inline-flex items-center gap-1.5 rounded-lg border-2 border-[#1C1917]",
        "bg-yellow-400 px-2.5 py-1.5 sm:px-3 sm:py-2",
        "text-base sm:text-lg font-bold shadow-[0_2px_0_#1C1917] select-none",
      ].join(" ")}
    >
      {icon}
      <span className="opacity-90">{label}</span>
      <span className="rounded bg-[#1C1917] px-1.5 py-0.5 sm:px-2 font-mono text-base sm:text-lg text-white min-w-[2ch] text-center">
        {value}
      </span>
    </div>
  );
}
