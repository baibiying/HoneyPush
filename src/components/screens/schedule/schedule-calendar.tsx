"use client";

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import type { ScheduleTask } from "./task-edit-dialog";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_START = 7;
const HOUR_END = 22;
const PX_PER_HOUR = 48;
const GRID_HEIGHT = (HOUR_END - HOUR_START) * PX_PER_HOUR;
const TIME_COLUMN_WIDTH = 44;

const HOUR_LABELS = Array.from(
  { length: HOUR_END - HOUR_START },
  (_, index) => HOUR_START + index
);

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
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
  const height = Math.max(32, bottom - top);
  const maxTop = GRID_HEIGHT - height;
  return {
    top: Math.min(top, maxTop),
    height,
  };
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
    let dayCount = 7;
    for (const task of scheduledTasks) {
      const start = startOfDay(new Date(task.scheduledStartAt!));
      const offset = Math.floor((start.getTime() - today.getTime()) / DAY_MS);
      if (offset >= dayCount) dayCount = offset + 1;
    }
    dayCount = Math.min(Math.max(dayCount, 7), 14);

    const days = Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(today.getTime() + index * DAY_MS);
      return { date, key: date.toISOString().slice(0, 10), tasks: [] as ScheduleTask[] };
    });

    const bucketMap = new Map(days.map((day) => [day.key, day]));

    for (const task of scheduledTasks) {
      const start = new Date(task.scheduledStartAt!);
      const key = startOfDay(start).toISOString().slice(0, 10);
      bucketMap.get(key)?.tasks.push(task);
    }

    return days;
  }, [scheduledTasks]);

  const hasAnyScheduled = scheduledTasks.length > 0;
  const dayColumnMinWidth = dayBuckets.length <= 3 ? 160 : 120;

  const body = (
    <>
      {!embedded && (
        <div className="flex items-center justify-between pb-2 border-b-2 border-[#1C1917]">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#F15A24]" />
            <h3 className="font-bold text-base tracking-wider font-comic">执行日历</h3>
          </div>
          <span className="text-[10px] font-bold text-neutral-500">
            {hasAnyScheduled ? `${scheduledTasks.length} 个时段` : "待排期"}
          </span>
        </div>
      )}

      {embedded && (
        <p className="text-[10px] font-bold text-neutral-500">
          {hasAnyScheduled ? `共 ${scheduledTasks.length} 个已排期时段` : "尚未排期 — 先去「可用时段」发起 AI 出征"}
        </p>
      )}

      <p className="text-xs text-neutral-600 font-semibold">
        纵轴为时间（{formatHourLabel(HOUR_START)}–{formatHourLabel(HOUR_END)}），任务块按开始/结束时间在对应日期列定位显示。
      </p>

      {!hasAnyScheduled ? (
        <div className="border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-10 text-center">
          <p className="text-sm font-comic text-neutral-500">暂无已排期的执行时段</p>
          <p className="text-xs text-neutral-400 mt-2">配置可用时间并点击「AI 排期」后在此查看</p>
        </div>
      ) : (
        <div className="overflow-auto max-h-[560px] border-2 border-[#1C1917] bg-[#FFFBEB]">
          <div
            className="min-w-max"
            style={{
              width: TIME_COLUMN_WIDTH + dayBuckets.length * dayColumnMinWidth,
            }}
          >
            <div className="flex border-b-2 border-[#1C1917] bg-[#1C1917] text-white sticky top-0 z-20">
              <div
                className="shrink-0 border-r border-white/20"
                style={{ width: TIME_COLUMN_WIDTH }}
              />
              {dayBuckets.map((day) => (
                <div
                  key={day.key}
                  className="px-2 py-2 text-[10px] font-bold text-center border-r border-white/20 last:border-r-0"
                  style={{ width: dayColumnMinWidth }}
                >
                  {formatDayLabel(day.date)}
                </div>
              ))}
            </div>

            <div className="flex">
              <div
                className="shrink-0 relative border-r-2 border-[#1C1917] bg-white"
                style={{ width: TIME_COLUMN_WIDTH, height: GRID_HEIGHT }}
              >
                {HOUR_LABELS.map((hour, index) => (
                  <div
                    key={hour}
                    className="absolute right-1 text-[9px] font-bold text-neutral-500 -translate-y-1/2"
                    style={{ top: index * PX_PER_HOUR }}
                  >
                    {formatHourLabel(hour)}
                  </div>
                ))}
              </div>

              {dayBuckets.map((day) => (
                <div
                  key={day.key}
                  className="relative border-r border-neutral-300 last:border-r-0 bg-[#FFFBEB]"
                  style={{ width: dayColumnMinWidth, height: GRID_HEIGHT }}
                >
                  {HOUR_LABELS.map((hour, index) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-t border-dashed border-neutral-300/80 pointer-events-none"
                      style={{ top: index * PX_PER_HOUR }}
                    />
                  ))}
                  <div
                    className="absolute left-0 right-0 border-t-2 border-[#1C1917] pointer-events-none"
                    style={{ top: GRID_HEIGHT }}
                  />

                  {day.tasks.map((task, index) => {
                    const { top, height } = getTaskBlockLayout(task, day.date);
                    const deadlineLabel = formatDeadline(task.deadline);
                    const showDetail = height >= 44;

                    return (
                      <div
                        key={task.id}
                        className="absolute left-1 right-1 z-10 overflow-hidden border-2 border-black bg-white shadow-[2px_2px_0_#1C1917] px-1.5 py-1"
                        style={{ top, height, zIndex: 10 + index }}
                        title={task.text}
                      >
                        {showDetail ? (
                          <>
                            <p className="text-[9px] font-black text-[#F15A24] leading-tight truncate">
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
                            <p className="text-[10px] font-bold text-neutral-900 leading-snug line-clamp-2">
                              {task.text}
                            </p>
                            {height >= 64 && (
                              <p className="text-[9px] text-neutral-500 font-semibold truncate">
                                预计 {task.durationMinutes} 分钟
                                {deadlineLabel ? ` · ${deadlineLabel}` : ""}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-[9px] font-bold text-neutral-900 truncate leading-tight">
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
      )}
    </>
  );

  if (embedded) {
    return <div className="space-y-3">{body}</div>;
  }

  return (
    <div className="bg-white p-5 comic-border comic-shadow space-y-4">
      {body}
    </div>
  );
}
