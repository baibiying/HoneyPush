"use client";

import type { ReactNode } from "react";
import {
  CalendarDays,
  Clock,
  LayoutGrid,
  Map,
  Plus,
  X,
} from "lucide-react";

export type ScheduleScene = "map" | "tasks" | "time" | "calendar";

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
  stats: { total: number; pending: number; done: number };
  scheduledCount: number;
  availabilityCount: number;
  questSteps: QuestStep[];
  onOpenAddTask: () => void;
  onRequireLogin: (message: string) => void;
  tasksPanel: ReactNode;
  timePanel: ReactNode;
  schedulePanel: ReactNode;
  scheduleOverlay?: ReactNode;
  scheduleCalendarHidden?: boolean;
};

type StationConfig = {
  id: ScheduleScene;
  /** create = 直接打开创建任务表单 */
  action: "create" | "enter";
  title: string;
  subtitle: string;
  icon: typeof Plus;
  gradient: string;
  glow: string;
  badge?: string;
};

const STATIONS: StationConfig[] = [
  {
    id: "tasks",
    action: "create",
    title: "创建任务",
    subtitle: "录入名称、用时与截止时间",
    icon: Plus,
    gradient: "from-emerald-500 to-teal-600",
    glow: "shadow-[0_0_28px_rgba(16,185,129,0.45)]",
  },
  {
    id: "tasks",
    action: "enter",
    title: "查看任务",
    subtitle: "浏览已创建任务 · 四象限分布",
    icon: LayoutGrid,
    gradient: "from-sky-500 to-indigo-600",
    glow: "shadow-[0_0_28px_rgba(56,189,248,0.45)]",
  },
  {
    id: "time",
    action: "enter",
    title: "可用时段",
    subtitle: "设置每天能做任务的时段",
    icon: Clock,
    gradient: "from-amber-400 to-orange-500",
    glow: "shadow-[0_0_28px_rgba(251,191,36,0.45)]",
  },
  {
    id: "calendar",
    action: "enter",
    title: "AI 排期",
    subtitle: "查看日历 · 一键排期全部任务",
    icon: CalendarDays,
    gradient: "from-fuchsia-500 to-purple-600",
    glow: "shadow-[0_0_28px_rgba(192,132,252,0.45)]",
  },
];

function QuestTracker({ steps, activeScene }: { steps: QuestStep[]; activeScene: ScheduleScene }) {
  return (
    <ol className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
      {steps.map((step, index) => {
        const active = activeScene === step.scene || (activeScene === "map" && step.done);
        return (
          <li key={step.id} className="flex items-center gap-1 sm:gap-2">
            <span
              className={[
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-bold border-2 transition-all",
                step.done
                  ? "bg-amber-300/90 border-amber-600 text-amber-950"
                  : "bg-white/10 border-white/25 text-white/70",
                active && !step.done ? "ring-2 ring-amber-200/80 scale-105" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black",
                  step.done ? "bg-amber-600 text-white" : "bg-white/15 text-white/80",
                ].join(" ")}
              >
                {step.done ? "✓" : index + 1}
              </span>
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <span className="hidden sm:inline text-white/30 text-xs font-bold">→</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function GameHud({
  stats,
  scheduledCount,
  canEdit,
}: {
  stats: { total: number; pending: number; done: number };
  scheduledCount: number;
  canEdit: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/80">HoneyPush · 排期副本</p>
        <h1 className="font-bangers text-2xl sm:text-3xl text-white tracking-wide drop-shadow-md">
          AI 排期冒险
        </h1>
      </div>
      <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs font-bold">
        <span className="rounded-lg border-2 border-amber-400/60 bg-amber-400/20 px-2.5 py-1 text-amber-100">
          任务 {stats.total}
        </span>
        <span className="rounded-lg border-2 border-emerald-400/50 bg-emerald-500/20 px-2.5 py-1 text-emerald-100">
          待办 {stats.pending}
        </span>
        <span className="rounded-lg border-2 border-violet-400/50 bg-violet-500/20 px-2.5 py-1 text-violet-100">
          已排期 {scheduledCount}
        </span>
        {!canEdit && (
          <span className="rounded-lg border-2 border-white/30 bg-white/10 px-2.5 py-1 text-white/80">
            浏览模式
          </span>
        )}
      </div>
    </div>
  );
}

function StationCard({
  station,
  onClick,
  onCreateTask,
  canEdit,
  onRequireLogin,
}: {
  station: StationConfig;
  onClick: () => void;
  onCreateTask?: () => void;
  canEdit: boolean;
  onRequireLogin: (message: string) => void;
}) {
  const Icon = station.icon;
  const opensCreateForm = station.action === "create";

  const handleClick = () => {
    if (opensCreateForm && onCreateTask) {
      if (!canEdit) {
        onRequireLogin("登录后才能创建任务。");
        return;
      }
      onCreateTask();
      return;
    }
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={[
        "group relative flex h-full min-h-[128px] sm:min-h-[148px] w-full flex-col rounded-2xl border-[3px] border-[#1C1917] p-4 sm:p-5 transition-all duration-200",
        "hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]",
        "bg-gradient-to-br",
        station.gradient,
        station.glow,
        "comic-shadow-sm",
      ].join(" ")}
    >
      <div className="absolute inset-0 rounded-2xl opacity-20 bg-[radial-gradient(circle_at_30%_20%,white,transparent_55%)] pointer-events-none" />
      <span className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-white/90 text-[#1C1917] shadow-sm pointer-events-none">
        <Icon className="h-5 w-5" />
      </span>
      <span className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 text-[10px] font-bold text-white/80 group-hover:text-white drop-shadow-[0_1px_0_#1C1917]">
        进入关卡 →
      </span>

      <h3 className="absolute inset-0 z-[1] flex items-center justify-center px-12 py-8 text-center font-bangers text-xl sm:text-2xl text-white tracking-wide drop-shadow-[0_2px_0_#1C1917] pointer-events-none">
        {station.title}
      </h3>
    </button>
  );
}

export function ScheduleGameHub({
  scene,
  onSceneChange,
  canEdit,
  stats,
  scheduledCount,
  availabilityCount,
  questSteps,
  onOpenAddTask,
  onRequireLogin,
  tasksPanel,
  timePanel,
  schedulePanel,
  scheduleOverlay,
  scheduleCalendarHidden = false,
}: ScheduleGameHubProps) {
  const mapStations: StationConfig[] = STATIONS;

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

        <div className="relative z-10 flex flex-1 min-h-0 flex-col gap-3 sm:gap-4 p-3 sm:p-5 md:p-6 overflow-hidden">
          {scene === "map" && (
            <>
              <GameHud stats={stats} scheduledCount={scheduledCount} canEdit={canEdit} />

              <div className="shrink-0 rounded-xl sm:rounded-2xl border-2 border-white/15 bg-black/25 px-3 py-2.5 sm:px-4 backdrop-blur-sm">
                <p className="text-center text-[10px] font-bold text-amber-200/90 mb-2 tracking-wider">
                  冒险进度
                </p>
                <QuestTracker steps={questSteps} activeScene={scene} />
              </div>

              {!canEdit && (
                <div className="shrink-0 rounded-xl border-2 border-amber-400/60 bg-amber-400/15 px-4 py-2 text-xs font-semibold text-amber-100 text-center">
                  当前为浏览模式。登录后可创建任务、查看任务、配置时间并 AI 排期。
                </div>
              )}
            </>
          )}

          {scene === "map" ? (
            <div className="animate-[fadeIn_0.35s_ease-out] flex-1 min-h-0 overflow-y-auto py-2 flex flex-col justify-center">
              <div className="mb-4 flex items-center justify-center gap-2 text-white/60">
                <Map className="h-4 w-4" />
                <p className="text-xs font-bold">选择关卡开始冒险</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-4xl mx-auto px-1 sm:px-4 items-stretch">
                {mapStations.map((station, index) => (
                  <StationCard
                    key={`${station.title}-${index}`}
                    station={station}
                    canEdit={canEdit}
                    onRequireLogin={onRequireLogin}
                    onCreateTask={() => {
                      if (!canEdit) {
                        onRequireLogin("登录后才能创建任务。");
                        return;
                      }
                      onOpenAddTask();
                    }}
                    onClick={() => onSceneChange(station.id)}
                  />
                ))}
              </div>
              <p className="mt-6 text-center text-[10px] text-white/50 font-medium max-w-md mx-auto">
                推荐流程：创建任务 → 查看任务 → 可用时段 → AI 排期
              </p>
            </div>
          ) : scene === "tasks" ? (
            <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden -mx-1 sm:-mx-2 animate-[fadeIn_0.3s_ease-out]">
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
            <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden -mx-1 sm:-mx-2 animate-[fadeIn_0.3s_ease-out]">
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
            <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden -mx-1 sm:-mx-2 animate-[fadeIn_0.3s_ease-out]">
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
