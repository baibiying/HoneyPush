"use client";

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import type { ScheduleTask } from "./task-edit-dialog";
import { FROSTED_FIELD } from "./task-form-shared";
import { getQuadrantMeta, normalizeQuadrantKey } from "./quadrants";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_START = 7;
const HOUR_END = 22;
const PX_PER_HOUR = 44;
const GRID_HEIGHT = (HOUR_END - HOUR_START) * PX_PER_HOUR;
const TIME_COLUMN_WIDTH = 40;
const DAY_COLUMN_WIDTH = 116;
/** 默认向前展示的天数（可左右滑动查看更多） */
const DEFAULT_FUTURE_DAYS = 30;
const EXTRA_DAYS_AFTER_LAST = 4;
const MAX_CALENDAR_DAYS = 90;

const HOUR_LABELS = Array.from(
  { length: HOUR_END - HOUR_START },
  (_, index) => HOUR_START + index
);

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatDateKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
}

function formatDayHeading(date: Date) {
  const todayKey = formatDateKey(startOfDay(new Date()));
  const label = formatDayLabel(date);
  return formatDateKey(date) === todayKey ? `今天 · ${label}` : label;
}

function formatHourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatDeadline(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getDayStartAnchor(dayDate: Date) {
  const anchor = new Date(dayDate);
  anchor.setHours(HOUR_START, 0, 0, 0);
  return anchor;
}

function dateToGridTop(date: Date, dayDate: Date) {
  const anchor = getDayStartAnchor(dayDate);
  const minutes = (date.getTime() - anchor.getTime()) / 60_000;
  const clamped = Math.max(0, Math.min(minutes, (HOUR_END - HOUR_START) * 60));
  return (clamped / 60) * PX_PER_HOUR;
}

function getTaskBlockLayout(task: ScheduleTask, dayDate: Date) {
  const start = new Date(task.scheduledStartAt!);
  const end = new Date(task.scheduledEndAt!);
  const top = dateToGridTop(start, dayDate);
  const bottom = dateToGridTop(end, dayDate);
  const height = Math.max(28, bottom - top);
  const maxTop = GRID_HEIGHT - height;
  return {
    top: Math.min(top, maxTop),
    height,
  };
}

function getTaskBlockClasses(category: string) {
  const meta = getQuadrantMeta(normalizeQuadrantKey(category));
  return [
    "absolute left-1 right-1 z-10 overflow-hidden rounded-lg border-2",
    meta.panelBorder.replace("border-[3px]", "border-2"),
    meta.panelBg,
    meta.panelShadow,
    "px-1.5 py-1 text-white",
  ].join(" ");
}

type ScheduleCalendarProps = {
  tasks: ScheduleTask[];
  /** 嵌入游戏关卡面板时去掉外层大边框 */
  embedded?: boolean;
};

export function ScheduleCalendar({ tasks, embedded = false }: ScheduleCalendarProps) {
  const scheduledTasks = useMemo(
    () =>
      tasks
        .filter((task) => !task.checked && task.scheduledStartAt && task.scheduledEndAt)
        .sort(
          (a, b) =>
            new Date(a.scheduledStartAt!).getTime() - new Date(b.scheduledStartAt!).getTime()
        ),
    [tasks]
  );

  const dayBuckets = useMemo(() => {
    const today = startOfDay(new Date());
    let maxDayOffset = DEFAULT_FUTURE_DAYS - 1;

    for (const task of scheduledTasks) {
      const start = startOfDay(new Date(task.scheduledStartAt!));
      const end = startOfDay(new Date(task.scheduledEndAt!));
      const startOffset = Math.floor((start.getTime() - today.getTime()) / DAY_MS);
      const endOffset = Math.floor((end.getTime() - today.getTime()) / DAY_MS);
      if (endOffset > maxDayOffset) maxDayOffset = endOffset;
      if (startOffset > maxDayOffset) maxDayOffset = startOffset;
    }

    for (const task of tasks) {
      if (task.checked || !task.deadline) continue;
      const deadline = new Date(task.deadline);
      if (Number.isNaN(deadline.getTime())) continue;
      const offset = Math.floor((startOfDay(deadline).getTime() - today.getTime()) / DAY_MS);
      if (offset > maxDayOffset) maxDayOffset = offset;
    }

    const dayCount = Math.min(
      Math.max(maxDayOffset + EXTRA_DAYS_AFTER_LAST + 1, DEFAULT_FUTURE_DAYS),
      MAX_CALENDAR_DAYS
    );

    const days = Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(today.getTime() + index * DAY_MS);
      return { date, key: formatDateKey(date), tasks: [] as ScheduleTask[] };
    });

    const bucketMap = new Map(days.map((day) => [day.key, day]));

    for (const task of scheduledTasks) {
      const start = new Date(task.scheduledStartAt!);
      const key = formatDateKey(startOfDay(start));
      const bucket = bucketMap.get(key);
      if (bucket) bucket.tasks.push(task);
    }

    return days;
  }, [scheduledTasks, tasks]);

  const hasAnyScheduled = scheduledTasks.length > 0;
  const gridWidth = TIME_COLUMN_WIDTH + dayBuckets.length * DAY_COLUMN_WIDTH;

  const statusLine = hasAnyScheduled
    ? `共 ${scheduledTasks.length} 个已排期时段`
    : "尚未排期 — 点击下方「排期」为全部待办生成日历";

  const emptyState = (
    <div className={`${FROSTED_FIELD} flex-1 min-h-0 flex flex-col items-center justify-center px-4 py-10 text-center`}>
      <CalendarDays className="mx-auto h-9 w-9 text-amber-300/90 mb-3" strokeWidth={2.5} />
      <p className="font-bangers text-lg text-amber-100/95 tracking-wide">暂无已排期时段</p>
      <p className="text-[10px] font-semibold text-amber-100/75 mt-2 max-w-xs mx-auto">
        配置「可用时段」后点击「排期」，任务将显示在下方日历中
      </p>
    </div>
  );

  const columnStyle = embedded
    ? { width: DAY_COLUMN_WIDTH, minHeight: GRID_HEIGHT, height: "100%" as const }
    : { width: DAY_COLUMN_WIDTH, height: GRID_HEIGHT };
  const timeColumnStyle = embedded
    ? { width: TIME_COLUMN_WIDTH, minHeight: GRID_HEIGHT, height: "100%" as const }
    : { width: TIME_COLUMN_WIDTH, height: GRID_HEIGHT };

  const calendarGrid = (
      <div
        className={[
          "overflow-x-auto overflow-y-auto overscroll-x-contain rounded-xl border-2 border-[#1C1917]/50 bg-black/30",
          embedded ? "flex flex-col flex-1 min-h-0 h-full w-full" : "max-h-[560px]",
        ].join(" ")}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div
          className={embedded ? "min-w-max min-h-full flex flex-col" : "min-w-max"}
          style={{ width: gridWidth, minHeight: embedded ? "100%" : undefined }}
        >
          <div className="flex shrink-0 border-b-2 border-[#1C1917]/60 sticky top-0 z-20">
            <div
              className="sticky left-0 z-30 shrink-0 border-r border-white/15 bg-gradient-to-br from-violet-800 to-purple-900 flex items-end justify-center pb-1.5"
              style={{ width: TIME_COLUMN_WIDTH }}
            >
              <span className="text-[8px] font-bold text-amber-200/80">时间</span>
            </div>
            <div className="flex bg-gradient-to-r from-violet-700/95 via-fuchsia-700/95 to-purple-800/95 backdrop-blur-sm">
              {dayBuckets.map((day) => (
                <div
                  key={day.key}
                  className="shrink-0 px-1.5 py-2 text-center border-r border-white/15 last:border-r-0"
                  style={{ width: DAY_COLUMN_WIDTH }}
                >
                  <p className="font-bangers text-[11px] sm:text-xs text-white tracking-wide drop-shadow-[0_1px_0_#1C1917] leading-tight">
                    {formatDayHeading(day.date)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            className={embedded ? "flex flex-1 min-h-0" : "flex"}
            style={embedded ? { minHeight: GRID_HEIGHT } : undefined}
          >
            <div
              className="sticky left-0 z-10 shrink-0 relative border-r border-white/15 bg-black/50"
              style={timeColumnStyle}
            >
              {HOUR_LABELS.map((hour, index) => (
                <div
                  key={hour}
                  className="absolute right-0.5 text-[8px] font-bold text-amber-100/65 tabular-nums -translate-y-1/2"
                  style={{ top: index * PX_PER_HOUR }}
                >
                  {formatHourLabel(hour)}
                </div>
              ))}
            </div>

            <div className="flex flex-1 min-h-0">
              {dayBuckets.map((day) => (
                <div
                  key={day.key}
                  className="relative shrink-0 border-r border-white/10 last:border-r-0 bg-black/25"
                  style={columnStyle}
                >
              {HOUR_LABELS.map((hour, index) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-dashed border-white/12 pointer-events-none"
                  style={{ top: index * PX_PER_HOUR }}
                />
              ))}
              <div className="absolute left-0 right-0 top-0 bottom-0 border-b-2 border-[#1C1917]/40 pointer-events-none" />

              {day.tasks.map((task, index) => {
                const { top, height } = getTaskBlockLayout(task, day.date);
                const deadlineLabel = formatDeadline(task.deadline);
                const showDetail = height >= 40;
                const meta = getQuadrantMeta(normalizeQuadrantKey(task.category));

                return (
                  <div
                    key={task.id}
                    className={getTaskBlockClasses(task.category)}
                    style={{ top, height, zIndex: 10 + index }}
                    title={task.text}
                  >
                    {showDetail ? (
                      <>
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="rounded px-1 py-px text-[8px] font-black bg-black/25 border border-white/30">
                            {meta.shortTag}
                          </span>
                          <p className="text-[8px] font-bold text-white/95 leading-none truncate flex-1 drop-shadow-[0_1px_0_#1C1917]">
                            {new Date(task.scheduledStartAt!).toLocaleTimeString("zh-CN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                            –
                            {new Date(task.scheduledEndAt!).toLocaleTimeString("zh-CN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </p>
                        </div>
                        <p className="text-[10px] font-black leading-snug line-clamp-2 drop-shadow-[0_1px_0_#1C1917]">
                          {task.text}
                        </p>
                        {height >= 56 && (
                          <p className="text-[8px] text-white/85 font-semibold truncate mt-0.5">
                            {task.durationMinutes} 分钟
                            {deadlineLabel ? ` · 截止 ${deadlineLabel}` : ""}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-[9px] font-black truncate leading-tight drop-shadow-[0_1px_0_#1C1917]">
                        {task.text}
                      </p>
                    )}
                  </div>
                );
              })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
  );

  if (embedded) {
    return (
      <div className="h-full min-h-0 flex flex-1 flex-col">
        {!hasAnyScheduled ? emptyState : calendarGrid}
      </div>
    );
  }

  return (
    <div className="bg-[#FFFBF0] p-5 border-[3px] border-[#1C1917] comic-shadow space-y-4 rounded-xl">
      <div className="flex items-center justify-between pb-2 border-b-2 border-[#1C1917]">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-[#F15A24]" />
          <h3 className="font-bangers text-lg tracking-wide text-[#1C1917]">执行日历</h3>
        </div>
        <span className="text-[10px] font-bold text-neutral-600">{statusLine}</span>
      </div>
      {!hasAnyScheduled ? emptyState : calendarGrid}
    </div>
  );
}
