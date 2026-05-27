"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, Clock, LayoutGrid } from "lucide-react";
import type { ScheduleTask } from "./task-edit-dialog";
import { planPomodoroSegments } from "@/lib/ai/schedule-times";
import { normalizeQuadrantKey } from "./quadrants";
import { useI18n } from "@/i18n/i18n-provider";
import { useLocalizedQuadrant } from "@/hooks/use-localized-quadrant";

const TOOLTIP_MAX_WIDTH_PX = 256;
const TOOLTIP_ESTIMATE_HEIGHT_PX = 260;
const TOOLTIP_GAP_PX = 10;
const VIEWPORT_PAD_PX = 12;

export type TaskTooltipPlacement = "above" | "below";

export type TaskTooltipPosition = {
  x: number;
  y: number;
  placement: TaskTooltipPlacement;
};

export function getTaskTooltipPosition(rect: DOMRect): TaskTooltipPosition {
  const maxWidth = Math.min(window.innerWidth - 32, TOOLTIP_MAX_WIDTH_PX);
  const halfW = maxWidth / 2;
  const centerX = rect.left + rect.width / 2;
  const x = Math.max(
    halfW + VIEWPORT_PAD_PX,
    Math.min(window.innerWidth - halfW - VIEWPORT_PAD_PX, centerX)
  );

  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  const fitsAbove = spaceAbove >= TOOLTIP_ESTIMATE_HEIGHT_PX + TOOLTIP_GAP_PX;
  const fitsBelow = spaceBelow >= TOOLTIP_ESTIMATE_HEIGHT_PX + TOOLTIP_GAP_PX;

  let placement: TaskTooltipPlacement = "above";
  if (!fitsAbove && fitsBelow) placement = "below";
  else if (!fitsAbove && !fitsBelow) {
    placement = spaceBelow > spaceAbove ? "below" : "above";
  } else if (fitsAbove && fitsBelow) {
    placement = spaceAbove >= spaceBelow ? "above" : "below";
  }

  const y =
    placement === "above" ? rect.top - TOOLTIP_GAP_PX : rect.bottom + TOOLTIP_GAP_PX;

  return { x, y, placement };
}

export function formatDateTimeParts(iso: string | null, dateLocale: string) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return {
    date: date.toLocaleDateString(dateLocale, { month: "long", day: "numeric" }),
    time: date.toLocaleTimeString(dateLocale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
}

type TaskHoverDetailCardProps = {
  task: ScheduleTask;
  /** 日历专注段的起止时间（优先于任务整体排期） */
  segmentStartAt?: string;
  segmentEndAt?: string;
  className?: string;
};

/** 任务详情卡片（用于 hover 浮层内容） */
export function TaskHoverDetailCard({
  task,
  segmentStartAt,
  segmentEndAt,
  className = "",
}: TaskHoverDetailCardProps) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "zh" ? "zh-CN" : "en-US";
  const quadrantKey = normalizeQuadrantKey(task.category);
  const meta = useLocalizedQuadrant(quadrantKey);

  const deadline = formatDateTimeParts(task.deadline, dateLocale);
  const segmentStart = formatDateTimeParts(segmentStartAt ?? null, dateLocale);
  const segmentEnd = formatDateTimeParts(segmentEndAt ?? null, dateLocale);
  const focusSegments = planPomodoroSegments(task.durationMinutes).filter(
    (segment) => segment.kind === "focus"
  ).length;

  return (
    <div
      className={[
        "rounded-2xl bg-white/98 backdrop-blur-md border border-neutral-200/90 shadow-[0_10px_28px_rgba(15,23,42,0.18)] overflow-hidden",
        className,
      ].join(" ")}
    >
      <div className="px-3 py-2 bg-neutral-50/90 border-b border-neutral-100">
        <p className="text-xs font-bold text-neutral-800 leading-snug line-clamp-3">{task.text}</p>
        {task.scheduledStartAt && task.scheduledEndAt ? (
          <p className="mt-1.5 text-[10px] font-medium text-neutral-500 leading-snug">
            {t("tasks.hover.scheduledNote", { segments: focusSegments })}
          </p>
        ) : null}
      </div>
      {segmentStart && segmentEnd ? (
        <div className="px-3 py-2.5 border-b border-neutral-100 bg-amber-50/80">
          <p className="text-[10px] font-medium text-amber-800/80 leading-none">
            {t("tasks.hover.segmentBlock")}
          </p>
          <p className="mt-1.5 text-sm font-bold text-neutral-900 tabular-nums leading-tight">
            {segmentStart.time}
            <span className="mx-1.5 text-neutral-400 font-semibold">→</span>
            {segmentEnd.time}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-neutral-500">{segmentStart.date}</p>
        </div>
      ) : null}
      <div className="px-3 py-2.5 grid grid-cols-2 gap-2.5">
        <div className="flex gap-2 min-w-0">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <Clock className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-neutral-400 leading-none">
              {t("tasks.hover.duration")}
            </p>
            <p className="mt-1 text-sm font-semibold text-neutral-800 tabular-nums">
              {task.durationMinutes}
              <span className="text-xs font-medium text-neutral-500 ml-0.5">
                {t("tasks.hover.minutesUnit")}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 min-w-0">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <Calendar className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-neutral-400 leading-none">
              {t("tasks.hover.deadline")}
            </p>
            {deadline ? (
              <>
                <p className="mt-1 text-xs font-semibold text-neutral-800 leading-tight">
                  {deadline.date}
                </p>
                <p className="text-xs font-medium text-neutral-500 tabular-nums">{deadline.time}</p>
              </>
            ) : (
              <p className="mt-1 text-xs font-medium text-neutral-400">{t("tasks.hover.notSet")}</p>
            )}
          </div>
        </div>
      </div>
      <div className="px-3 py-2 border-t border-neutral-100 flex items-center gap-2 bg-white">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <LayoutGrid className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-neutral-400 leading-none">
            {t("tasks.hover.quadrant")}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-neutral-800 leading-snug">
            <span className="font-black text-[#1C1917]">{meta.shortTag}</span>
            <span className="mx-1 text-neutral-400">·</span>
            {meta.title}
            <span className="text-neutral-500 font-medium">
              {locale === "zh" ? `（${meta.subtitle}）` : ` (${meta.subtitle})`}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

type TaskHoverTooltipPortalProps = {
  task: ScheduleTask;
  open: boolean;
  position: TaskTooltipPosition | null;
  segmentStartAt?: string;
  segmentEndAt?: string;
};

/** 挂到 document.body，避免被 overflow 裁切；根据视口自动显示在上方或下方 */
export function TaskHoverTooltipPortal({
  task,
  open,
  position,
  segmentStartAt,
  segmentEndAt,
}: TaskHoverTooltipPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !position || !mounted || typeof document === "undefined") return null;

  const transform =
    position.placement === "above"
      ? "translate(-50%, -100%)"
      : "translate(-50%, 0)";

  return createPortal(
    <div
      className="pointer-events-none fixed z-[200] w-[min(100vw-2rem,16rem)]"
      style={{ left: position.x, top: position.y, transform }}
      role="tooltip"
    >
      {position.placement === "below" ? (
        <div className="mx-auto mb-1 h-2 w-2 rotate-45 bg-white border-l border-t border-neutral-200/90 shadow-sm" />
      ) : null}
      <TaskHoverDetailCard
        task={task}
        segmentStartAt={segmentStartAt}
        segmentEndAt={segmentEndAt}
      />
      {position.placement === "above" ? (
        <div className="mx-auto h-2 w-2 rotate-45 bg-white border-r border-b border-neutral-200/90 -mt-1 shadow-sm" />
      ) : null}
    </div>,
    document.body
  );
}
