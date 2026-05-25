"use client";

import { useMemo } from "react";
import { Calendar, Clock, Pencil, Trash2 } from "lucide-react";
import type { ScheduleTask } from "./task-edit-dialog";
import {
  MATRIX_GRID_ORDER,
  getQuadrantMeta,
  normalizeQuadrantKey,
  type QuadrantKey,
} from "./quadrants";

const BUBBLE_SLOTS = [
  { x: 26, y: 30 },
  { x: 58, y: 24 },
  { x: 42, y: 56 },
  { x: 72, y: 50 },
  { x: 18, y: 58 },
  { x: 50, y: 38 },
  { x: 34, y: 20 },
  { x: 66, y: 68 },
  { x: 24, y: 44 },
  { x: 54, y: 72 },
];

const QUADRANT_LAYOUT_OFFSET: Record<QuadrantKey, { x: number; y: number }> = {
  "import-noturgent": { x: 0, y: 0 },
  "import-urgent": { x: 3, y: -2 },
  "notimport-noturgent": { x: -2, y: 3 },
  "notimport-urgent": { x: 4, y: 2 },
};

function seededUnit(id: number, channel: number) {
  const x = Math.sin(id * 12.9898 + channel * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function taskDisplayText(text: string) {
  const trimmed = text.trim();
  return trimmed || "任务";
}

function computeBubbleSize(task: ScheduleTask, density: number) {
  const chars = [...taskDisplayText(task.text)].length;
  const durationBoost = Math.min(12, Math.floor(task.durationMinutes / 45) * 5);
  const lines = Math.ceil(chars / 3.5);
  const diameter = 28 + lines * 12 + Math.sqrt(chars) * 4 + durationBoost;
  return Math.round(Math.min(160, Math.max(52, diameter)) * density);
}

function bubbleLabelClass(size: number, text: string) {
  const chars = [...taskDisplayText(text)].length;
  if (chars <= 6) return size >= 64 ? "text-[11px]" : "text-[10px]";
  if (chars <= 12) return "text-[10px]";
  if (chars <= 24) return "text-[9px]";
  return "text-[8px]";
}

function formatDateTimeParts(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return {
    date: date.toLocaleDateString("zh-CN", { month: "long", day: "numeric" }),
    time: date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

function isTaskScheduled(task: ScheduleTask) {
  return Boolean(task.scheduledStartAt && task.scheduledEndAt);
}

function compareTasksInQuadrant(a: ScheduleTask, b: ScheduleTask) {
  const scheduledA = isTaskScheduled(a);
  const scheduledB = isTaskScheduled(b);
  if (scheduledA !== scheduledB) return scheduledA ? -1 : 1;

  if (scheduledA && scheduledB) {
    const startA = new Date(a.scheduledStartAt!).getTime();
    const startB = new Date(b.scheduledStartAt!).getTime();
    if (startA !== startB) return startA - startB;
  }

  const deadlineA = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
  const deadlineB = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
  if (deadlineA !== deadlineB) return deadlineA - deadlineB;
  return b.id - a.id;
}

type BubbleLayout = {
  taskId: number;
  x: number;
  y: number;
  size: number;
  rotate: number;
  delay: number;
};

function layoutTaskBubbles(tasks: ScheduleTask[], quadrantKey: QuadrantKey): BubbleLayout[] {
  const offset = QUADRANT_LAYOUT_OFFSET[quadrantKey];
  const density = tasks.length > 6 ? 0.88 : tasks.length > 4 ? 0.94 : 1;

  return tasks.map((task, index) => {
    const slot = BUBBLE_SLOTS[index % BUBBLE_SLOTS.length];
    const jitterX = (seededUnit(task.id, 1) - 0.5) * 12;
    const jitterY = (seededUnit(task.id, 2) - 0.5) * 12;

    return {
      taskId: task.id,
      x: Math.min(86, Math.max(14, (slot.x + jitterX + offset.x) * density)),
      y: Math.min(82, Math.max(18, (slot.y + jitterY + offset.y) * density)),
      size: computeBubbleSize(task, density),
      rotate: (seededUnit(task.id, 3) - 0.5) * 10,
      delay: seededUnit(task.id, 4) * 2.5,
    };
  });
}

type TaskHoverDetailProps = {
  task: ScheduleTask;
};

function TaskHoverDetail({ task }: TaskHoverDetailProps) {
  const deadline = formatDateTimeParts(task.deadline);

  return (
    <div
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] z-50 w-[min(100vw-2rem,15rem)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 scale-95 group-hover:scale-100"
      aria-hidden
    >
      <div className="rounded-2xl bg-white/98 backdrop-blur-md border border-neutral-200/90 shadow-[0_10px_28px_rgba(15,23,42,0.14)] overflow-hidden">
        <div className="px-3 py-2 bg-neutral-50/90 border-b border-neutral-100">
          <p className="text-xs font-bold text-neutral-800 leading-snug line-clamp-2">{task.text}</p>
        </div>
        <div className="px-3 py-2.5 grid grid-cols-2 gap-2.5">
          <div className="flex gap-2 min-w-0">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Clock className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-neutral-400 leading-none">预计用时</p>
              <p className="mt-1 text-sm font-semibold text-neutral-800 tabular-nums">
                {task.durationMinutes}
                <span className="text-xs font-medium text-neutral-500 ml-0.5">分钟</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2 min-w-0">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Calendar className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-neutral-400 leading-none">截止</p>
              {deadline ? (
                <>
                  <p className="mt-1 text-xs font-semibold text-neutral-800 leading-tight">{deadline.date}</p>
                  <p className="text-xs font-medium text-neutral-500 tabular-nums">{deadline.time}</p>
                </>
              ) : (
                <p className="mt-1 text-xs font-medium text-neutral-400">未设置</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto h-2 w-2 rotate-45 bg-white border-r border-b border-neutral-200/90 -mt-1 shadow-sm" />
    </div>
  );
}

type TaskBubbleProps = {
  task: ScheduleTask;
  layout: BubbleLayout;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function TaskBubble({ task, layout, menuOpen, onMenuToggle, onEdit, onDelete }: TaskBubbleProps) {
  const scheduled = isTaskScheduled(task);
  const label = taskDisplayText(task.text);

  return (
    <div
      className="absolute group"
      style={{
        left: `${layout.x}%`,
        top: `${layout.y}%`,
        width: layout.size,
        height: layout.size,
        transform: `translate(-50%, -50%) rotate(${layout.rotate}deg)`,
        animationDelay: `${layout.delay}s`,
        zIndex: menuOpen ? 40 : undefined,
      }}
    >
      <div
        className={[
          "relative w-full h-full bubble-float",
          menuOpen ? "z-40" : "z-10 group-hover:z-30",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMenuToggle();
          }}
          className={[
            "relative w-full h-full rounded-full flex items-center justify-center p-2 cursor-pointer transition-all duration-200 overflow-hidden",
            "hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
            scheduled
              ? "bg-gradient-to-br from-[#FFF4C2] via-[#FFE08A] to-[#F5B942] border-[3px] border-amber-500/90 shadow-[0_5px_0_#c97a0a,0_10px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_0_#b45309,0_14px_24px_rgba(0,0,0,0.18)]"
              : "bg-gradient-to-br from-white via-slate-50 to-slate-100 border-[2.5px] border-dashed border-white/95 shadow-[0_4px_0_rgba(255,255,255,0.35),0_8px_16px_rgba(0,0,0,0.1)] hover:shadow-[0_5px_0_rgba(255,255,255,0.5),0_12px_20px_rgba(0,0,0,0.12)]",
            menuOpen
              ? scheduled
                ? "ring-4 ring-amber-200/90 scale-110"
                : "ring-4 ring-white/90 scale-110"
              : "",
          ].join(" ")}
          style={{ animationDelay: `${layout.delay}s` }}
        >
          <span
            className={[
              "block w-[92%] max-h-[88%] text-center font-black leading-tight select-none break-words whitespace-normal",
              scheduled ? "text-amber-950" : "text-slate-600",
              bubbleLabelClass(layout.size, task.text),
            ].join(" ")}
            style={{ transform: `rotate(${-layout.rotate}deg)` }}
          >
            {label}
          </span>
          {scheduled && (
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-500 border-2 border-amber-100 shadow-sm" />
          )}
        </button>

        <TaskHoverDetail task={task} />

        {menuOpen && (
          <div
            className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+6px)] z-50 min-w-[7.5rem] rounded-xl border border-neutral-200 bg-white shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onEdit}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 border-b border-neutral-100"
            >
              <Pencil className="w-3.5 h-3.5" />
              编辑
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type QuadrantPanelProps = {
  quadrantKey: QuadrantKey;
  tasks: ScheduleTask[];
  openTaskMenuId: number | null;
  canEdit: boolean;
  fullscreen?: boolean;
  onRequireLogin: () => void;
  onMenuToggle: (taskId: number) => void;
  onEdit: (task: ScheduleTask) => void;
  onDelete: (taskId: number) => void;
};

function QuadrantPanel({
  quadrantKey,
  tasks,
  openTaskMenuId,
  canEdit,
  fullscreen = false,
  onRequireLogin,
  onMenuToggle,
  onEdit,
  onDelete,
}: QuadrantPanelProps) {
  const meta = getQuadrantMeta(quadrantKey);
  const layouts = useMemo(() => layoutTaskBubbles(tasks, quadrantKey), [tasks, quadrantKey]);
  const layoutByTaskId = useMemo(() => new Map(layouts.map((l) => [l.taskId, l])), [layouts]);

  return (
    <div
      className={[
        meta.panelBg,
        meta.panelBorder,
        meta.panelShadow,
        "rounded-xl md:rounded-2xl overflow-visible relative",
        fullscreen ? "h-full min-h-[120px]" : "min-h-[200px] md:min-h-[240px]",
      ].join(" ")}
    >
      <div
        className="absolute inset-0 rounded-xl md:rounded-2xl opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 25%, rgba(255,255,255,0.45) 0%, transparent 50%), radial-gradient(circle at 80% 75%, rgba(0,0,0,0.15) 0%, transparent 45%)",
        }}
      />
      {fullscreen && (
        <span className="absolute top-2 left-2 z-[1] rounded-md border-2 border-black/30 bg-black/25 px-1.5 py-0.5 font-bangers text-[10px] text-white/95 tracking-wide">
          {meta.shortTag}
        </span>
      )}
      <div
        className={[
          "relative w-full h-full p-2 md:p-3",
          fullscreen ? "min-h-[120px]" : "min-h-[200px] md:min-h-[240px]",
        ].join(" ")}
      >
        {tasks.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-white/80 font-bold font-comic px-2 text-center">
            暂无任务
          </p>
        ) : (
          tasks.map((task) => {
            const layout = layoutByTaskId.get(task.id);
            if (!layout) return null;
            return (
              <TaskBubble
                key={task.id}
                task={task}
                layout={layout}
                menuOpen={openTaskMenuId === task.id}
                onMenuToggle={() => {
                  if (!canEdit) {
                    onRequireLogin();
                    return;
                  }
                  onMenuToggle(task.id);
                }}
                onEdit={() => onEdit(task)}
                onDelete={() => onDelete(task.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

type QuadrantTaskBoardProps = {
  tasks: ScheduleTask[];
  openTaskMenuId: number | null;
  canEdit: boolean;
  fullscreen?: boolean;
  onRequireLogin: () => void;
  onMenuToggle: (taskId: number) => void;
  onEdit: (task: ScheduleTask) => void;
  onDelete: (taskId: number) => void;
};

export function QuadrantTaskBoard({
  tasks,
  openTaskMenuId,
  canEdit,
  fullscreen = false,
  onRequireLogin,
  onMenuToggle,
  onEdit,
  onDelete,
}: QuadrantTaskBoardProps) {
  const tasksByQuadrant = MATRIX_GRID_ORDER.reduce(
    (acc, key) => {
      acc[key] = [];
      return acc;
    },
    {} as Record<QuadrantKey, ScheduleTask[]>
  );

  for (const task of tasks) {
    if (task.checked) continue;
    const key = normalizeQuadrantKey(task.category);
    tasksByQuadrant[key].push(task);
  }

  for (const key of MATRIX_GRID_ORDER) {
    tasksByQuadrant[key].sort(compareTasksInQuadrant);
  }

  const pendingCount = Object.values(tasksByQuadrant).reduce((sum, list) => sum + list.length, 0);

  const axisClass = fullscreen
    ? "text-amber-50 font-bangers font-bold tracking-wider drop-shadow-[0_2px_0_rgba(0,0,0,0.85)]"
    : "text-sky-500 font-bold";
  const crossColor = fullscreen ? "border-amber-200/95" : "border-sky-200/90";
  const crossH = fullscreen
    ? `w-full border-t-[3px] ${crossColor} shadow-[0_0_14px_rgba(251,191,36,0.5)]`
    : `w-full border-t ${crossColor}`;
  const crossV = fullscreen
    ? `absolute h-full border-l-[3px] ${crossColor} shadow-[0_0_14px_rgba(251,191,36,0.5)]`
    : `absolute h-full border-l ${crossColor}`;

  if (tasks.length === 0) {
    return (
      <p
        className={[
          "text-center py-12 font-comic",
          fullscreen ? "text-amber-100/90 text-sm" : "text-sm text-neutral-500",
        ].join(" ")}
      >
        还没有任务。去地图点击「创建任务」录入第一条。
      </p>
    );
  }

  if (pendingCount === 0) {
    return (
      <p
        className={[
          "text-center py-12 font-comic",
          fullscreen ? "text-amber-100/90 text-sm" : "text-sm text-neutral-500",
        ].join(" ")}
      >
        待办已全部完成
      </p>
    );
  }

  return (
    <div
      className={[
        "relative flex h-full min-h-0 flex-col",
        fullscreen ? "w-full py-1" : "mx-auto max-w-5xl py-2 md:py-4",
      ].join(" ")}
    >
      <p
        className={[
          "text-center tracking-wide shrink-0",
          axisClass,
          fullscreen ? "mb-2 sm:mb-3 text-base sm:text-xl" : "mb-2 md:mb-3 text-sm",
        ].join(" ")}
      >
        重要
      </p>

      <MatrixScheduleLegend fullscreen={fullscreen} />

      <div className={["flex items-stretch min-h-0", fullscreen ? "flex-1 gap-1.5 sm:gap-3" : "gap-2 md:gap-4"].join(" ")}>
        <p
          className={[
            "hidden sm:flex items-center justify-center shrink-0 [writing-mode:vertical-rl]",
            axisClass,
            fullscreen ? "w-9 sm:w-10 text-sm sm:text-lg" : "w-6 text-xs",
          ].join(" ")}
        >
          不紧急
        </p>

        <div className="relative flex-1 min-w-0 min-h-0 flex flex-col">
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className={crossH} />
            <div className={crossV} />
          </div>

          <div
            className={[
              "relative grid grid-cols-2 flex-1 min-h-0 overflow-visible",
              fullscreen ? "gap-2 sm:gap-3 p-0.5" : "gap-3 md:gap-5 p-1",
            ].join(" ")}
          >
            {MATRIX_GRID_ORDER.map((key) => (
              <QuadrantPanel
                key={key}
                quadrantKey={key}
                tasks={tasksByQuadrant[key]}
                openTaskMenuId={openTaskMenuId}
                canEdit={canEdit}
                fullscreen={fullscreen}
                onRequireLogin={onRequireLogin}
                onMenuToggle={onMenuToggle}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>

        <p
          className={[
            "hidden sm:flex items-center justify-center shrink-0 [writing-mode:vertical-rl]",
            axisClass,
            fullscreen ? "w-9 sm:w-10 text-sm sm:text-lg" : "w-6 text-xs",
          ].join(" ")}
        >
          紧急
        </p>
      </div>

      <div
        className={[
          "flex justify-center gap-6 shrink-0 sm:hidden",
          axisClass,
          fullscreen ? "mt-3 text-sm sm:text-base" : "mt-3 md:mt-4 text-xs",
        ].join(" ")}
      >
        <span>不紧急</span>
        <span>紧急</span>
      </div>

      <p
        className={[
          "text-center tracking-wide shrink-0",
          axisClass,
          fullscreen ? "mt-3 sm:mt-4 text-base sm:text-xl" : "mt-3 md:mt-4 text-sm",
        ].join(" ")}
      >
        不重要
      </p>
    </div>
  );
}

function MatrixScheduleLegend({ fullscreen = false }: { fullscreen?: boolean }) {
  return (
    <div
      className={[
        "flex flex-wrap items-center justify-center gap-x-8 sm:gap-x-12 gap-y-3 shrink-0 mx-auto max-w-lg w-full",
        fullscreen
          ? "mb-3 sm:mb-4 py-3 sm:py-3.5 px-4 rounded-2xl border-2 border-amber-300/50 bg-black/45 shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
          : "mb-3 md:mb-4 py-2.5 px-4 rounded-xl border-2 border-[#1C1917]/15 bg-white/80",
      ].join(" ")}
      aria-label="任务排期状态图例"
    >
      <div className="flex items-center gap-3">
        <span
          className={[
            "shrink-0 rounded-full bg-gradient-to-br from-[#FFF4C2] via-[#FFE08A] to-[#F5B942] border-[3px] border-amber-500 shadow-[0_3px_0_#c97a0a]",
            fullscreen ? "h-8 w-8 sm:h-9 sm:w-9" : "h-7 w-7",
          ].join(" ")}
          aria-hidden
        />
        <span
          className={[
            "font-bold",
            fullscreen ? "text-sm sm:text-base text-amber-50 drop-shadow-[0_1px_0_rgba(0,0,0,0.6)]" : "text-sm text-neutral-800",
          ].join(" ")}
        >
          金色圆球 = 已排期
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={[
            "shrink-0 rounded-full bg-gradient-to-br from-white via-slate-50 to-slate-100 border-[3px] border-dashed border-slate-400 shadow-[0_2px_0_rgba(0,0,0,0.15)]",
            fullscreen ? "h-8 w-8 sm:h-9 sm:w-9" : "h-7 w-7",
          ].join(" ")}
          aria-hidden
        />
        <span
          className={[
            "font-bold",
            fullscreen ? "text-sm sm:text-base text-amber-50 drop-shadow-[0_1px_0_rgba(0,0,0,0.6)]" : "text-sm text-neutral-800",
          ].join(" ")}
        >
          白色圆球 = 待排期
        </span>
      </div>
    </div>
  );
}
