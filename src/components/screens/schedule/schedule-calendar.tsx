"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import type { ScheduleTask } from "./task-edit-dialog";
import { FROSTED_FIELD } from "./task-form-shared";
import { expandScheduledTaskToFocusSegments } from "@/lib/ai/schedule-times";
import { useI18n } from "@/i18n/i18n-provider";
import { formatDayLabel } from "@/i18n/format-day-label";
import { SchedulePomodoroHint } from "./schedule-pomodoro-hint";
import {
  buildCalendarTaskColorMap,
  getCalendarTaskPalette,
  type CalendarTaskPalette,
} from "./calendar-task-colors";
import {
  TaskHoverTooltipPortal,
  getTaskTooltipPosition,
  type TaskTooltipPosition,
} from "./task-hover-detail";

const DAY_MS = 24 * 60 * 60 * 1000;
/** 每天完整 24 小时（0:00–24:00），与可用时段一致 */
const HOUR_START = 0;
const HOUR_END = 24;
/** 每小时行高（越大时间区域越易辨认，1 分钟 ≈ 1.47px） */
const PX_PER_HOUR = 88;
const GRID_HEIGHT = (HOUR_END - HOUR_START) * PX_PER_HOUR;
/** 左侧时间轴列宽 */
const TIME_COLUMN_WIDTH = 88;
const DAY_COLUMN_WIDTH = 192;
/** 相邻任务块底部留白，避免视觉叠在一起 */
const BLOCK_VISUAL_GAP_PX = 3;
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

function localeDayLabel(date: Date, dateLocale: string) {
  return date.toLocaleDateString(dateLocale, {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
}

function formatDayHeading(
  date: Date,
  dateLocale: string,
  t: (path: string, params?: Record<string, string | number>) => string,
) {
  const dateKey = formatDateKey(date);
  const label = localeDayLabel(date, dateLocale);
  return formatDayLabel(dateKey, label, t);
}

function formatHourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatBlockTimeRange(startAt: string, endAt: string, dateLocale: string) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString(dateLocale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  return `${fmt(startAt)} – ${fmt(endAt)}`;
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

type FocusBlockLayout = { top: number; height: number };

function getFocusBlockLayout(startAt: string, endAt: string, dayDate: Date): FocusBlockLayout {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const top = dateToGridTop(start, dayDate);
  const bottom = dateToGridTop(end, dayDate);
  const rawHeight = bottom - top;
  const height = Math.max(8, rawHeight - BLOCK_VISUAL_GAP_PX);
  const maxTop = GRID_HEIGHT - height;
  return {
    top: Math.min(top, maxTop),
    height,
  };
}

type LaidOutBlock = {
  block: CalendarDisplayBlock;
  layout: FocusBlockLayout;
  lane: number;
  laneCount: number;
};

/** 时间重叠的块分列展示，避免挤在同一条竖线上 */
function assignBlockLanes(blocks: CalendarDisplayBlock[], dayDate: Date): LaidOutBlock[] {
  const entries = blocks
    .map((block) => ({
      block,
      layout: getFocusBlockLayout(block.startAt, block.endAt, dayDate),
      lane: 0,
    }))
    .sort(
      (a, b) =>
        a.layout.top - b.layout.top ||
        new Date(a.block.startAt).getTime() - new Date(b.block.startAt).getTime()
    );

  const laneEnds: number[] = [];

  for (const entry of entries) {
    let lane = 0;
    while (lane < laneEnds.length && entry.layout.top < laneEnds[lane] - 1) {
      lane += 1;
    }
    if (lane === laneEnds.length) laneEnds.push(0);
    entry.lane = lane;
    laneEnds[lane] = entry.layout.top + entry.layout.height;
  }

  const laneCount = Math.max(1, laneEnds.length);
  return entries.map((entry) => ({ ...entry, laneCount }));
}

function blockLaneStyle(lane: number, laneCount: number) {
  const gapPx = 6;
  const widthPercent = 100 / laneCount;
  return {
    left: `calc(${lane * widthPercent}% + ${gapPx / 2}px)`,
    width: `calc(${widthPercent}% - ${gapPx}px)`,
  };
}

type CalendarDisplayBlock = {
  task: ScheduleTask;
  startAt: string;
  endAt: string;
  blockKey: string;
};

function getTaskBlockClasses(palette: CalendarTaskPalette) {
  return [
    "absolute overflow-hidden rounded-lg border-2 cursor-default box-border",
    palette.border,
    palette.bg,
    "shadow-[0_2px_0_rgba(28,25,23,0.85)]",
    "px-2 py-0.5 text-white",
  ].join(" ");
}

function getTaskBlockStyle(palette: CalendarTaskPalette) {
  if (!palette.style) return undefined;
  return {
    background: palette.style.background,
    borderColor: palette.style.borderColor,
  } as const;
}

type CalendarTaskBlockProps = {
  block: CalendarDisplayBlock;
  layout: FocusBlockLayout;
  lane: number;
  laneCount: number;
  stackIndex: number;
  colorMap: Map<number, CalendarTaskPalette>;
};

function CalendarTaskBlock({
  block,
  layout,
  lane,
  laneCount,
  stackIndex,
  colorMap,
}: CalendarTaskBlockProps) {
  const { locale } = useI18n();
  const dateLocale = locale === "zh" ? "zh-CN" : "en-US";
  const { task, startAt, endAt } = block;
  const blockRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<TaskTooltipPosition | null>(null);

  const { top, height } = layout;
  const palette = getCalendarTaskPalette(task.id, colorMap);
  const timeRange = formatBlockTimeRange(startAt, endAt, dateLocale);
  const titleLineClamp =
    height >= 72
      ? "line-clamp-3 text-lg sm:text-xl leading-tight"
      : height >= 48
        ? "line-clamp-2 text-base sm:text-lg leading-tight"
        : "truncate text-base sm:text-lg leading-tight";

  const openTooltip = () => {
    const rect = blockRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos(getTaskTooltipPosition(rect));
    setHovered(true);
  };

  return (
    <>
      <div
        ref={blockRef}
        className={getTaskBlockClasses(palette)}
        style={{
          top,
          height,
          zIndex: 10 + stackIndex,
          ...blockLaneStyle(lane, laneCount),
          ...getTaskBlockStyle(palette),
        }}
        onMouseEnter={openTooltip}
        onMouseLeave={() => setHovered(false)}
        aria-label={`${task.text}，${timeRange}`}
      >
        <div className="flex h-full min-h-0 items-center">
          <p
            className={[
              "w-full font-black leading-snug drop-shadow-[0_1px_0_#1C1917]",
              titleLineClamp,
            ].join(" ")}
          >
            {task.text}
          </p>
        </div>
      </div>
      <TaskHoverTooltipPortal
        task={task}
        open={hovered}
        position={tooltipPos}
        segmentStartAt={startAt}
        segmentEndAt={endAt}
      />
    </>
  );
}

type ScheduleCalendarProps = {
  tasks: ScheduleTask[];
  /** 嵌入游戏关卡面板时去掉外层大边框 */
  embedded?: boolean;
};

export function ScheduleCalendar({
  tasks,
  embedded = false,
}: ScheduleCalendarProps) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "zh" ? "zh-CN" : "en-US";

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

  const taskColorMap = useMemo(
    () => buildCalendarTaskColorMap(scheduledTasks.map((task) => task.id)),
    [scheduledTasks]
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
      return {
        date,
        key: formatDateKey(date),
        blocks: [] as CalendarDisplayBlock[],
        laidOut: [] as LaidOutBlock[],
      };
    });

    const bucketMap = new Map(days.map((day) => [day.key, day]));

    for (const task of scheduledTasks) {
      for (const segment of expandScheduledTaskToFocusSegments(task)) {
        const start = new Date(segment.startAt);
        const key = formatDateKey(startOfDay(start));
        const bucket = bucketMap.get(key);
        if (!bucket) continue;
        bucket.blocks.push({
          task,
          startAt: segment.startAt,
          endAt: segment.endAt,
          blockKey: `${task.id}-${segment.segmentIndex}`,
        });
      }
    }

    for (const day of days) {
      day.laidOut = assignBlockLanes(day.blocks, day.date);
    }

    return days;
  }, [scheduledTasks, tasks]);

  const hasAnyScheduled = scheduledTasks.length > 0;
  const gridWidth = TIME_COLUMN_WIDTH + dayBuckets.length * DAY_COLUMN_WIDTH;

  const statusLine = hasAnyScheduled
    ? t("calendar.statusCount", { count: scheduledTasks.length })
    : t("calendar.statusEmpty");

  const emptyState = (
    <div className={`${FROSTED_FIELD} flex-1 min-h-0 flex flex-col items-center justify-center px-4 py-10 text-center`}>
      <CalendarDays className="mx-auto h-9 w-9 text-amber-300/90 mb-3" strokeWidth={2.5} />
      <p className="font-bangers text-lg text-amber-100/95 tracking-wide">{t("calendar.noSlots")}</p>
      <SchedulePomodoroHint variant="empty" />
      <p className="text-xs sm:text-sm font-bold text-amber-100/70 mt-3 max-w-xs mx-auto">
        {t("calendar.emptyHint")}
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
          embedded ? "flex flex-col flex-1 min-h-0 h-full w-full" : "max-h-[min(720px,70vh)]",
        ].join(" ")}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div
          className={embedded ? "min-w-max min-h-full flex flex-col" : "min-w-max"}
          style={{ width: gridWidth, minHeight: embedded ? "100%" : undefined }}
        >
          <div className="flex shrink-0 border-b-2 border-[#1C1917]/60 sticky top-0 z-20">
            <div
              className="sticky left-0 z-30 shrink-0 border-r border-white/15 bg-gradient-to-br from-violet-800 to-purple-900 flex items-end justify-center pb-2 px-1"
              style={{ width: TIME_COLUMN_WIDTH }}
            >
              <span className="text-[10px] sm:text-xs font-bold text-amber-100/90">{t("common.time")}</span>
            </div>
            <div className="flex bg-gradient-to-r from-violet-700/95 via-fuchsia-700/95 to-purple-800/95 backdrop-blur-sm">
              {dayBuckets.map((day) => (
                <div
                  key={day.key}
                  className="shrink-0 px-1.5 py-2 text-center border-r border-white/15 last:border-r-0"
                  style={{ width: DAY_COLUMN_WIDTH }}
                >
                  <p className="font-bangers text-[11px] sm:text-xs text-white tracking-wide drop-shadow-[0_1px_0_#1C1917] leading-tight">
                    {formatDayHeading(day.date, dateLocale, t)}
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
              className="sticky left-0 z-10 shrink-0 relative border-r-2 border-white/20 bg-gradient-to-b from-black/60 to-black/45"
              style={timeColumnStyle}
            >
              {HOUR_LABELS.map((hour, index) => (
                <div
                  key={`hour-band-${hour}`}
                  className="absolute left-0 right-0 border-t border-white/10 pointer-events-none"
                  style={{ top: index * PX_PER_HOUR, height: PX_PER_HOUR }}
                >
                  <div
                    className="absolute inset-x-0 top-0 border-t border-dashed border-amber-200/25 pointer-events-none"
                    style={{ top: PX_PER_HOUR / 2 }}
                  />
                </div>
              ))}
              {HOUR_LABELS.map((hour, index) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 flex items-start justify-end pr-2 pt-0.5 pointer-events-none"
                  style={{ top: index * PX_PER_HOUR, height: PX_PER_HOUR }}
                >
                  <span className="text-[11px] sm:text-xs font-bold text-amber-50 tabular-nums leading-none drop-shadow-[0_1px_0_rgba(0,0,0,0.8)]">
                    {formatHourLabel(hour)}
                  </span>
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
                  className="absolute left-0 right-0 pointer-events-none"
                  style={{ top: index * PX_PER_HOUR, height: PX_PER_HOUR }}
                >
                  <div className="absolute inset-x-0 top-0 border-t border-white/18" />
                  <div
                    className="absolute inset-x-0 border-t border-dashed border-white/10"
                    style={{ top: PX_PER_HOUR / 2 }}
                  />
                </div>
              ))}
              <div className="absolute left-0 right-0 top-0 bottom-0 border-b-2 border-[#1C1917]/40 pointer-events-none" />

              {day.laidOut.map((entry, index) => (
                <CalendarTaskBlock
                  key={entry.block.blockKey}
                  block={entry.block}
                  layout={entry.layout}
                  lane={entry.lane}
                  laneCount={entry.laneCount}
                  stackIndex={index}
                  colorMap={taskColorMap}
                />
              ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
  );

  if (embedded) {
    return (
      <div className="h-full min-h-0 flex flex-1 flex-col p-2 sm:p-3">
        <SchedulePomodoroHint variant="banner" />
        <div className="flex-1 min-h-0 flex flex-col">
          {!hasAnyScheduled ? emptyState : calendarGrid}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFBF0] p-5 border-[3px] border-[#1C1917] comic-shadow space-y-4 rounded-xl">
      <div className="flex items-center justify-between pb-2 border-b-2 border-[#1C1917]">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-[#F15A24]" />
          <h3 className="font-bangers text-lg tracking-wide text-[#1C1917]">{t("calendar.title")}</h3>
        </div>
        <span className="text-[10px] font-bold text-neutral-600">{statusLine}</span>
      </div>
      <SchedulePomodoroHint variant="bannerLight" />
      {!hasAnyScheduled ? emptyState : calendarGrid}
    </div>
  );
}
