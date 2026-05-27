"use client";

import type { ReactNode } from "react";
import {
  CalendarDays,
  ChevronDown,
  Clock,
  LayoutGrid,
  Plus,
  ScrollText,
  Shield,
  X,
} from "lucide-react";
import { ScheduleAdventureMap } from "./schedule-adventure-map";
import { HomeCommanderDock } from "./home-commander-dock";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { useI18n } from "@/i18n/i18n-provider";
import { BRAND_MARK_ZH, BRAND_NAME } from "@/lib/brand";
import { ScenePanelHeader } from "./scene-panel-header";

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
  createTaskPanel: ReactNode;
  tasksPanel: ReactNode;
  timePanel: ReactNode;
  schedulePanel: ReactNode;
  officerPanel: ReactNode;
  scheduleOverlay?: ReactNode;
  scheduleCalendarHidden?: boolean;
  mapPerformanceDock?: ReactNode;
  performancePanel: ReactNode;
};

export type { StationConfig } from "./schedule-stations";
export { STATIONS } from "./schedule-stations";

function MapOceanBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 min-h-full overflow-hidden" aria-hidden>
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
  const { t } = useI18n();

  return (
    <div className="relative w-full px-4 py-2 sm:px-6 sm:py-2.5 md:px-8">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent"
        aria-hidden
      />

      <div className="relative z-[1] flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="min-w-0 flex flex-col gap-0.5 sm:gap-1">
          <div className="flex items-baseline justify-center gap-x-2 sm:gap-x-3 lg:justify-start">
            <span className="font-bangers text-3xl sm:text-5xl md:text-6xl text-amber-200 tracking-wide leading-none drop-shadow-[0_3px_0_#1C1917]">
              {BRAND_NAME}
            </span>
            <h1 className="font-bangers text-3xl sm:text-5xl md:text-6xl text-white tracking-wide leading-none drop-shadow-[0_3px_0_#1C1917]">
              {BRAND_MARK_ZH}
            </h1>
          </div>
          <p className="text-center lg:text-left font-comic text-base sm:text-lg md:text-xl font-bold leading-snug text-amber-100/95">
            {t("brand.tagline")}
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 lg:items-end lg:pt-1">
          <LocaleSwitcher />
          <HomeCommanderDock />
        </div>
      </div>
    </div>
  );
}

function IslandSceneShell({
  title,
  icon,
  onBack,
  children,
  panelClassName = `flex-1 min-h-0 overflow-hidden p-1 sm:p-2 ${FROSTED_PANEL}`,
}: {
  title: string;
  icon: ReactNode;
  onBack: () => void;
  children: ReactNode;
  panelClassName?: string;
}) {
  const { t } = useI18n();

  return (
    <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden p-3 sm:p-5 md:p-6 animate-[fadeIn_0.3s_ease-out]">
      <button
        type="button"
        onClick={onBack}
        className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-white/95 text-[#1C1917] comic-shadow-sm hover:bg-amber-50"
        aria-label={t("hub.backToMap")}
      >
        <X className="h-5 w-5" />
      </button>
      <ScenePanelHeader icon={icon} title={title} />
      <div className={panelClassName}>{children}</div>
    </div>
  );
}

function MapAdventureHint() {
  const { t } = useI18n();

  return (
    <div
      className={[
        "relative shrink-0 z-20 flex flex-col items-center justify-center gap-1",
        "border-b border-amber-400/25 bg-gradient-to-b from-[#312e81]/90 to-[#1e1b4b]/70",
        "px-4 py-2 sm:py-2.5 backdrop-blur-sm",
      ].join(" ")}
    >
      <p className="font-comic text-sm sm:text-base md:text-lg font-bold text-amber-100/95 text-center leading-snug">
        {t("hub.mapHint")}
      </p>
      <ChevronDown
        className="h-4 w-4 sm:h-5 sm:w-5 text-amber-300/80 animate-bounce"
        aria-hidden
      />
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
  createTaskPanel,
  tasksPanel,
  timePanel,
  schedulePanel,
  officerPanel,
  scheduleOverlay,
  scheduleCalendarHidden = false,
  mapPerformanceDock,
  performancePanel,
}: ScheduleGameHubProps) {
  const { t } = useI18n();

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
            <div className="relative flex flex-1 min-h-0 w-full flex-col overflow-hidden animate-[fadeIn_0.35s_ease-out]">
              <div className="shrink-0 z-20 w-full border-b border-white/15 bg-[#312e81]/75 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
                <GameHud />
              </div>

              {mapPerformanceDock}

              <MapAdventureHint />

              <div className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain scroll-smooth">
                <div className="relative w-full">
                  <MapOceanBackdrop />
                  <ScheduleAdventureMap
                    questSteps={questSteps}
                    canEdit={canEdit}
                    onSceneChange={onSceneChange}
                    onOpenAddTask={onOpenAddTask}
                    onRequireLogin={onRequireLogin}
                  />
                </div>
              </div>
            </div>
          ) : scene === "create" ? (
            <IslandSceneShell
              title={t("tasks.addTitle")}
              onBack={() => onSceneChange("map")}
              panelClassName="flex flex-1 min-h-0 flex-col overflow-hidden"
              icon={
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-[0_3px_0_#134e4a]">
                  <Plus className="h-4 w-4" />
                </span>
              }
            >
              {createTaskPanel}
            </IslandSceneShell>
          ) : scene === "tasks" ? (
            <IslandSceneShell
              title={t("hub.sceneTasks")}
              onBack={() => onSceneChange("map")}
              icon={
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-gradient-to-br from-sky-400 to-indigo-600 text-white shadow-[0_3px_0_#312e81]">
                  <LayoutGrid className="h-4 w-4" />
                </span>
              }
            >
              {tasksPanel}
            </IslandSceneShell>
          ) : scene === "officer" ? (
            <IslandSceneShell
              title={t("hub.sceneOfficer")}
              onBack={() => onSceneChange("map")}
              icon={
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-gradient-to-br from-orange-500 to-red-700 text-white shadow-[0_3px_0_#7f1d1d]">
                  <Shield className="h-4 w-4" />
                </span>
              }
            >
              <div className="h-full min-h-0 overflow-y-auto">{officerPanel}</div>
            </IslandSceneShell>
          ) : scene === "time" ? (
            <IslandSceneShell
              title={t("hub.sceneTime")}
              onBack={() => onSceneChange("map")}
              icon={
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_3px_0_#c2410c]">
                  <Clock className="h-4 w-4" />
                </span>
              }
            >
              <div className="h-full min-h-0 overflow-y-auto p-3 sm:p-4">{timePanel}</div>
            </IslandSceneShell>
          ) : scene === "calendar" ? (
            <IslandSceneShell
              title={t("hub.sceneCalendar")}
              onBack={() => onSceneChange("map")}
              panelClassName={`relative flex-1 min-h-0 overflow-hidden p-1 sm:p-2 ${FROSTED_PANEL} flex flex-col`}
              icon={
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-[0_3px_0_#312e81]">
                  <CalendarDays className="h-4 w-4" />
                </span>
              }
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
            </IslandSceneShell>
          ) : scene === "performance" ? (
            <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden p-3 sm:p-4 md:p-5 animate-[fadeIn_0.3s_ease-out]">
              <button
                type="button"
                onClick={() => onSceneChange("map")}
                className="absolute top-2 right-2 sm:top-3 sm:right-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1C1917] bg-[#FFF8E7] text-[#1C1917] shadow-[0_4px_0_#1C1917] hover:bg-amber-100"
                aria-label={t("hub.rollScrollBack")}
              >
                <X className="h-5 w-5" />
              </button>
              <div className="shrink-0 mb-2 pr-14">
                <ScenePanelHeader
                  title={t("hub.scenePerformance")}
                  icon={
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-gradient-to-br from-amber-300 to-amber-600 text-[#1C1917] shadow-[0_3px_0_#1C1917]">
                      <ScrollText className="h-4 w-4" />
                    </span>
                  }
                />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain">
                {performancePanel}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
