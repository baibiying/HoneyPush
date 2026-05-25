"use client";

import type { ReactNode } from "react";

/** 与 schedule layout、四象限页相同的可视区域（不覆盖顶栏导航） */
export const SCHEDULE_VIEWPORT =
  "fixed inset-x-0 top-[60px] md:top-[96px] bottom-0 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0";

/** 与 schedule-game-hub 一致的紫色渐变 + 白点星空底 */
const SCHEDULE_HUB_STARFIELD = {
  backgroundImage:
    "radial-gradient(circle at 15% 20%, rgba(251,191,36,0.25) 0%, transparent 40%), radial-gradient(circle at 85% 75%, rgba(56,189,248,0.2) 0%, transparent 45%), radial-gradient(white 1px, transparent 1px)",
  backgroundSize: "auto, auto, 24px 24px",
} as const;

export function ScheduleHubBackground() {
  return (
    <>
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#1e1b4b] via-[#4c1d95] to-[#312e81]"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-40"
        style={SCHEDULE_HUB_STARFIELD}
        aria-hidden
      />
    </>
  );
}

/** 与四象限内容区一致的紫色磨砂面板 */
export const FROSTED_PANEL =
  "rounded-xl border-2 border-white/20 bg-black/20 backdrop-blur-[2px]";

export const FROSTED_FIELD =
  "rounded-xl border border-white/25 bg-white/10 backdrop-blur-sm";

export const GAME_INPUT =
  "rounded-xl border-2 border-[#1C1917] bg-[#FFFBF0] text-[#1C1917] font-bold shadow-[inset_2px_2px_0_rgba(28,25,23,0.08)] focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-300/80";

export const QUADRANT_STYLES: Record<
  string,
  { ring: string; bg: string; active: string; tag: string }
> = {
  "import-urgent": {
    ring: "ring-orange-500",
    bg: "from-orange-400 to-amber-500",
    active: "border-[#1C1917] bg-gradient-to-br from-orange-200 to-amber-100 comic-shadow-sm scale-[1.02]",
    tag: "Q1",
  },
  "import-noturgent": {
    ring: "ring-emerald-500",
    bg: "from-emerald-400 to-green-500",
    active: "border-[#1C1917] bg-gradient-to-br from-emerald-200 to-green-100 comic-shadow-sm scale-[1.02]",
    tag: "Q2",
  },
  "notimport-urgent": {
    ring: "ring-lime-500",
    bg: "from-lime-400 to-green-400",
    active: "border-[#1C1917] bg-gradient-to-br from-lime-200 to-green-100 comic-shadow-sm scale-[1.02]",
    tag: "Q3",
  },
  "notimport-noturgent": {
    ring: "ring-sky-500",
    bg: "from-sky-400 to-cyan-500",
    active: "border-[#1C1917] bg-gradient-to-br from-sky-200 to-cyan-100 comic-shadow-sm scale-[1.02]",
    tag: "Q4",
  },
};

export function GameField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children: ReactNode;
}) {
  return (
    <div className={`${FROSTED_FIELD} p-3 sm:p-3.5`}>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#1C1917] bg-gradient-to-br from-amber-300 to-orange-400 text-[#1C1917] shadow-[0_2px_0_#1C1917]">
          <Icon className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <label className="font-bangers text-base text-white tracking-wide drop-shadow-[0_1px_0_#1C1917]">
          {label}
        </label>
      </div>
      {children}
    </div>
  );
}
