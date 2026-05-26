"use client";

import type { ReactNode } from "react";
import { CalendarDays, Clock, LayoutGrid, X } from "lucide-react";
import { ScheduleAdventureMap } from "./schedule-adventure-map";

import type { ScheduleScene } from "./schedule-stations";

export type { ScheduleScene } from "./schedule-stations";

/** 与四象限、创建任务内容区一致的紫色磨砂面板 */
const FROSTED_PANEL =
  "rounded-xl border-2 border-white/20 bg-black/20 backdrop-blur-[2px]";

export type QuestStep = {
  id: string;
  label: string;
  done: boolean;
  scene: ScheduleScene;
};

type ScheduleGameHubProps = {
  scene: ScheduleScene;
  onSceneChange: (scene: ScheduleScene) => void;
  canEdit: boolean;
  questSteps: QuestStep[];
  onOpenAddTask: () => void;
  onRequireLogin: (message: string) => void;
  tasksPanel: ReactNode;
  timePanel: ReactNode;
  schedulePanel: ReactNode;
  scheduleOverlay?: ReactNode;
  scheduleCalendarHidden?: boolean;
};

export type { StationConfig } from "./schedule-stations";
export { STATIONS } from "./schedule-stations";

function MapOceanBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: [
            "radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.55), transparent)",
            "radial-gradient(1px 1px at 30% 65%, rgba(255,255,255,0.35), transparent)",
            "radial-gradient(1.5px 1.5px at 55% 15%, rgba(255,255,255,0.45), transparent)",
            "radial-gradient(1px 1px at 72% 48%, rgba(255,255,255,0.3), transparent)",
            "radial-gradient(1px 1px at 88% 28%, rgba(255,255,255,0.5), transparent)",
            "radial-gradient(1px 1px at 92% 78%, rgba(255,255,255,0.35), transparent)",
          ].join(", "),
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-t from-cyan-900/35 via-sky-900/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-16 sm:h-20 overflow-hidden opacity-40">
        <div className="ocean-wave-drift flex w-[200%] h-full">
          <svg className="w-1/2 h-full" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden>
            <path
              d="M0 22 C50 8 100 32 150 18 C200 6 250 28 300 16 C350 8 380 20 400 14 V40 H0Z"
              fill="rgba(56,189,248,0.25)"
            />
          </svg>
          <svg className="w-1/2 h-full" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden>
            <path
              d="M0 22 C50 8 100 32 150 18 C200 6 250 28 300 16 C350 8 380 20 400 14 V40 H0Z"
              fill="rgba(56,189,248,0.25)"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function GameHud() {
  return (
    <div
      className={[
        "relative w-full max-w-2xl mx-auto text-center",
        "rounded-xl border-2 border-[#1C1917] bg-black/30 backdrop-blur-md",
        "shadow-[0_4px_0_#1C1917,0_0_24px_rgba(129,140,248,0.25)]",
        "px-4 py-2.5 sm:px-5 sm:py-3",
      ].join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent"
        aria-hidden
      />
      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.22em] text-amber-200/90">
        HoneyPush
      </p>
      <h1 className="font-bangers mt-0.5 text-3xl sm:text-4xl text-white tracking-wide leading-none drop-shadow-[0_3px_0_#1C1917]">
        督蜜
      </h1>
      <p className="mx-auto mt-1.5 max-w-md font-comic text-xs sm:text-sm font-bold leading-snug text-amber-100/90">
        AI 智能排期 + 游戏化监督 · 理清任务、专注执行
      </p>
      <p className="mt-1 text-[10px] sm:text-xs font-semibold text-white/45">点击岛屿开始冒险</p>
    </div>
  );
}

export function ScheduleGameHub({
  scene,
  onSceneChange,
  canEdit,
  questSteps,
  onOpenAddTask,
  onRequireLogin,
  tasksPanel,
  timePanel,
  schedulePanel,
  scheduleOverlay,
  scheduleCalendarHidden = false,
}: ScheduleGameHubProps) {
  return (
    <div className="relative w-full h-full min-h-0 flex flex-col flex-1">
      <div className="relative flex-1 min-h-0 overflow-hidden rounded-none border-y-[4px] border-[#1C1917] comic-shadow-lg flex flex-col">
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#1e1b4b] via-[#4c1d95] to-[#312e81]"
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(251,191,36,0.25) 0%, transparent 40%), radial-gradient(circle at 85% 75%, rgba(56,189,248,0.2) 0%, transparent 45%), radial-gradient(white 1px, transparent 1px)",
            backgroundSize: "auto, auto, 24px 24px",
          }}
          aria-hidden
        />

        <div className="relative z-10 flex flex-1 min-h-0 flex-col overflow-hidden">
          {scene === "map" ? (
            <div className="relative flex-1 min-h-0 w-full animate-[fadeIn_0.35s_ease-out]">
              <MapOceanBackdrop />
              <ScheduleAdventureMap
                questSteps={questSteps}
                canEdit={canEdit}
                onSceneChange={onSceneChange}
                onOpenAddTask={onOpenAddTask}
                onRequireLogin={onRequireLogin}
              />

              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center gap-2 px-3 pt-2 sm:pt-3">
                <div className="pointer-events-auto w-full max-w-2xl">
                  <GameHud />
                </div>
                {!canEdit && (
                  <p className="pointer-events-auto w-full max-w-2xl rounded-lg border-2 border-amber-400/55 bg-amber-500/15 px-3 py-1.5 text-center text-[11px] sm:text-xs font-bold text-amber-100 backdrop-blur-sm shadow-[0_2px_0_#1C1917]">
                    🔒 浏览模式 · 登录后可登岛冒险
                  </p>
                )}
              </div>
            </div>
          ) : scene === "tasks" ? (
            <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden p-3 sm:p-5 md:p-6 animate-[fadeIn_0.3s_ease-out]">
              <button
                type="button"
                onClick={() => onSceneChange("map")}
                className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-white/95 text-[#1C1917] comic-shadow-sm hover:bg-amber-50"
                aria-label="返回地图"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="shrink-0 mb-2 sm:mb-3 pr-12">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-gradient-to-br from-sky-400 to-indigo-600 text-white shadow-[0_3px_0_#312e81]">
                    <LayoutGrid className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-bangers text-lg sm:text-2xl text-white tracking-wide drop-shadow-[0_2px_0_#1C1917] truncate">
                      查看任务
                    </h2>
                  </div>
                </div>
              </div>
              <div className={`flex-1 min-h-0 overflow-hidden p-1 sm:p-2 ${FROSTED_PANEL}`}>
                {tasksPanel}
              </div>
            </div>
          ) : scene === "time" ? (
            <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden p-3 sm:p-5 md:p-6 animate-[fadeIn_0.3s_ease-out]">
              <button
                type="button"
                onClick={() => onSceneChange("map")}
                className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-white/95 text-[#1C1917] comic-shadow-sm hover:bg-amber-50"
                aria-label="返回地图"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="shrink-0 mb-2 sm:mb-3 pr-12">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_3px_0_#c2410c]">
                    <Clock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-bangers text-lg sm:text-2xl text-white tracking-wide drop-shadow-[0_2px_0_#1C1917] truncate">
                      可用时段
                    </h2>
                  </div>
                </div>
              </div>
              <div className={`flex-1 min-h-0 overflow-hidden p-1 sm:p-2 ${FROSTED_PANEL}`}>
                <div className="h-full min-h-0 overflow-y-auto p-3 sm:p-4">{timePanel}</div>
              </div>
            </div>
          ) : (
            <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden p-3 sm:p-5 md:p-6 animate-[fadeIn_0.3s_ease-out]">
              <button
                type="button"
                onClick={() => onSceneChange("map")}
                className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-white/95 text-[#1C1917] comic-shadow-sm hover:bg-amber-50"
                aria-label="返回地图"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="shrink-0 mb-2 sm:mb-3 pr-12">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-[0_3px_0_#312e81]">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-bangers text-lg sm:text-2xl text-white tracking-wide drop-shadow-[0_2px_0_#1C1917] truncate">
                      AI 排期
                    </h2>
                  </div>
                </div>
              </div>
              <div
                className={`relative flex-1 min-h-0 overflow-hidden p-1 sm:p-2 ${FROSTED_PANEL} flex flex-col`}
              >
                <div
                  className={[
                    "flex-1 min-h-0 h-full min-w-0 transition-opacity duration-200",
                    scheduleCalendarHidden ? "opacity-0 pointer-events-none" : "opacity-100",
                  ].join(" ")}
                  aria-hidden={scheduleCalendarHidden}
                >
                  {schedulePanel}
                </div>
                {scheduleOverlay}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
