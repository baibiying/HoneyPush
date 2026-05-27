"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Clock } from "lucide-react";
import {
  formatAvailabilitySlot,
  formatDateInput,
  type AvailabilitySlotInput,
} from "@/lib/ai/availability";
import { useI18n } from "@/i18n/i18n-provider";
import { formatDayLabel } from "@/i18n/format-day-label";
import type { TranslateParams } from "@/i18n/translate";

export type AvailabilitySlotRow = AvailabilitySlotInput & { id: string };

const GAME_INPUT =
  "rounded-xl border-2 border-[#1C1917] bg-[#FFFBF0] text-[#1C1917] font-bold shadow-[inset_2px_2px_0_rgba(28,25,23,0.08)] focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-300/80";

const FROSTED_FIELD =
  "rounded-xl border border-white/25 bg-white/10 backdrop-blur-sm";

/** 每天完整 24 小时（0:00–24:00） */
const HOUR_START = 0;
const HOUR_END = 24;
const RANGE_START_MIN = HOUR_START * 60;
const RANGE_END_MIN = HOUR_END * 60;
const RANGE_TOTAL_MIN = RANGE_END_MIN - RANGE_START_MIN;
const SNAP_MINUTES = 1;
const MIN_SLOT_MINUTES = 15;
const DEFAULT_SLOT_MINUTES = 60;
const TIMELINE_HOURS = Array.from(
  { length: HOUR_END - HOUR_START + 1 },
  (_, i) => HOUR_START + i
);

function newSlotId() {
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function slotRowId(slot: AvailabilitySlotInput) {
  return `${slot.date}_${slot.startTime}_${slot.endTime}`;
}

export function toAvailabilityRows(slots: AvailabilitySlotInput[]): AvailabilitySlotRow[] {
  return slots.map((slot) => ({ ...slot, id: slotRowId(slot) }));
}

function createEmptySlot(date?: string): AvailabilitySlotRow {
  return {
    id: newSlotId(),
    date: date ?? formatDateInput(new Date()),
    startTime: "09:00",
    endTime: "12:00",
  };
}

function timeToMinutes(time: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return RANGE_START_MIN;
  return Number(match[1]) * 60 + Number(match[2]);
}

function snapMinutes(minutes: number) {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

function clampMinutes(minutes: number) {
  return Math.max(RANGE_START_MIN, Math.min(RANGE_END_MIN, minutes));
}

function minutesToTime(minutes: number) {
  const clamped = clampMinutes(minutes);
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function minutesFromClientX(clientX: number, rect: DOMRect) {
  const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
  return snapMinutes(RANGE_START_MIN + (percent / 100) * RANGE_TOTAL_MIN);
}

function slotBarStyle(startTime: string, endTime: string) {
  const start = Math.max(RANGE_START_MIN, timeToMinutes(startTime));
  const end = Math.min(RANGE_END_MIN, timeToMinutes(endTime));
  if (end <= start) return null;

  return {
    left: ((start - RANGE_START_MIN) / RANGE_TOTAL_MIN) * 100,
    width: Math.max(2.5, ((end - start) / RANGE_TOTAL_MIN) * 100),
  };
}

function buildSlotFromClick(date: string, clickMinutes: number): AvailabilitySlotRow {
  let start = clampMinutes(snapMinutes(clickMinutes));
  let end = start + DEFAULT_SLOT_MINUTES;
  if (end > RANGE_END_MIN) {
    end = RANGE_END_MIN;
    start = Math.max(RANGE_START_MIN, end - DEFAULT_SLOT_MINUTES);
  }
  if (end - start < MIN_SLOT_MINUTES) {
    start = Math.max(RANGE_START_MIN, end - MIN_SLOT_MINUTES);
  }

  return {
    id: newSlotId(),
    date,
    startTime: minutesToTime(start),
    endTime: minutesToTime(end),
  };
}

type TimelineDrag = {
  slotId: string;
  edge: "start" | "end";
};

type DayTimelineCardProps = {
  date: string;
  slots: AvailabilitySlotRow[];
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  onAddSlot: (slot: AvailabilitySlotRow) => void;
  onUpdateSlot: (id: string, patch: Partial<AvailabilitySlotInput>) => void;
  onRemoveSlot: (id: string) => void;
};

function DayTimelineCard({
  date,
  slots,
  selectedId,
  onSelectId,
  onAddSlot,
  onUpdateSlot,
  onRemoveSlot,
}: DayTimelineCardProps) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "zh" ? "zh-CN" : "en-US";
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<TimelineDrag | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-slot-block]")) return;
    const track = trackRef.current;
    if (!track) return;

    const next = buildSlotFromClick(date, minutesFromClientX(e.clientX, track.getBoundingClientRect()));
    onAddSlot(next);
    onSelectId(next.id);
  };

  const startDrag = (e: React.PointerEvent, slotId: string, edge: "start" | "end") => {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { slotId, edge };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const applyDrag = useCallback(
    (clientX: number) => {
      const drag = dragRef.current;
      const track = trackRef.current;
      if (!drag || !track) return;

      const slot = slots.find((s) => s.id === drag.slotId);
      if (!slot) return;

      const minutes = minutesFromClientX(clientX, track.getBoundingClientRect());
      if (drag.edge === "start") {
        const end = timeToMinutes(slot.endTime);
        const nextStart = Math.min(minutes, end - MIN_SLOT_MINUTES);
        onUpdateSlot(drag.slotId, { startTime: minutesToTime(nextStart) });
      } else {
        const start = timeToMinutes(slot.startTime);
        const nextEnd = Math.max(minutes, start + MIN_SLOT_MINUTES);
        onUpdateSlot(drag.slotId, { endTime: minutesToTime(nextEnd) });
      }
    },
    [slots, onUpdateSlot]
  );

  useEffect(() => {
    if (!dragging) return;

    const onPointerMove = (e: PointerEvent) => {
      applyDrag(e.clientX);
    };

    const endDrag = () => {
      dragRef.current = null;
      setDragging(false);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [dragging, applyDrag]);

  return (
    <div className={`${FROSTED_FIELD} p-3 sm:p-3.5`}>
      <p className="font-bangers text-base sm:text-lg text-white tracking-wide drop-shadow-[0_1px_0_#1C1917] mb-2.5">
        {formatDayHeading(date, dateLocale, t)}
      </p>

      <div
        ref={trackRef}
        role="presentation"
        onPointerDown={handleTrackPointerDown}
        className={[
          "relative h-20 sm:h-24 rounded-xl border-2 border-[#1C1917]/40 bg-black/30 overflow-visible cursor-crosshair touch-none",
          dragging ? "select-none" : "",
        ].join(" ")}
      >
        <div className="absolute inset-0 flex pointer-events-none">
          {TIMELINE_HOURS.slice(0, -1).map((hour) => (
            <div key={hour} className="flex-1 border-r border-white/10 last:border-r-0" />
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex justify-between px-1 pb-0.5 pointer-events-none">
          {TIMELINE_HOURS.filter((_, i) => i % 5 === 0 || i === TIMELINE_HOURS.length - 1).map(
            (hour) => (
              <span
                key={hour}
                className="text-[8px] sm:text-[9px] font-bold text-white/40 tabular-nums"
              >
                {hour}
              </span>
            )
          )}
        </div>

        {slots.map((slot) => {
          const bar = slotBarStyle(slot.startTime, slot.endTime);
          if (!bar) return null;
          const isSelected = selectedId === slot.id;
          return (
            <div
              key={slot.id}
              data-slot-block
              className={[
                "absolute top-1.5 bottom-6 min-w-[2.5rem] rounded-lg border-2 border-[#1C1917]",
                "bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500",
                isSelected ? "ring-2 ring-amber-200 z-10 comic-shadow-sm" : "z-[1]",
              ].join(" ")}
              style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
              title={formatAvailabilitySlot(slot)}
            >
              <button
                type="button"
                aria-label={t("availability.dragStart")}
                onPointerDown={(e) => startDrag(e, slot.id, "start")}
                className="absolute left-0 top-0 bottom-0 w-2.5 sm:w-3 cursor-ew-resize rounded-l-md bg-[#1C1917]/25 hover:bg-[#1C1917]/45 z-20"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectId(isSelected ? null : slot.id);
                }}
                className="absolute inset-x-2.5 sm:inset-x-3 top-0 bottom-0 flex items-center justify-center overflow-hidden"
              >
                <span className="px-0.5 text-base sm:text-xl md:text-2xl font-bangers font-bold leading-none tracking-wide text-[#1C1917] truncate pointer-events-none drop-shadow-[0_1px_0_rgba(255,255,255,0.35)]">
                  {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}
                </span>
              </button>
              {isSelected && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveSlot(slot.id);
                    onSelectId(null);
                  }}
                  className="absolute left-1/2 top-0 z-30 flex h-6 w-6 sm:h-7 sm:w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border-2 border-[#1C1917] bg-white text-rose-600 shadow-[0_2px_0_#1C1917] hover:bg-rose-50 active:scale-95"
                  aria-label={t("availability.deleteSlot")}
                  title={t("availability.deleteSlotTitle")}
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} />
                </button>
              )}
              <button
                type="button"
                aria-label={t("availability.dragEnd")}
                onPointerDown={(e) => startDrag(e, slot.id, "end")}
                className="absolute right-0 top-0 bottom-0 w-2.5 sm:w-3 cursor-ew-resize rounded-r-md bg-[#1C1917]/25 hover:bg-[#1C1917]/45 z-20"
              />
            </div>
          );
        })}
      </div>

      {slots.length === 0 && (
        <p className="mt-2 text-[10px] font-semibold text-amber-100/70 text-center">
          {t("availability.timelineHint")}
        </p>
      )}

    </div>
  );
}

function formatDayHeading(
  dateStr: string,
  dateLocale: string,
  t: (path: string, params?: TranslateParams) => string,
) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return dateStr;
  const label = date.toLocaleDateString(dateLocale, {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  return formatDayLabel(dateStr, label, t);
}

type AvailabilityEditorProps = {
  slots: AvailabilitySlotRow[];
  onChange: (slots: AvailabilitySlotRow[]) => void;
  showHeader?: boolean;
  variant?: "default" | "game";
};

type GameDayGroup = {
  date: string;
  slots: AvailabilitySlotRow[];
};

function groupSlotsByDate(slots: AvailabilitySlotRow[]): GameDayGroup[] {
  const map = new Map<string, AvailabilitySlotRow[]>();
  for (const slot of slots) {
    const list = map.get(slot.date) ?? [];
    list.push(slot);
    map.set(slot.date, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daySlots]) => ({
      date,
      slots: daySlots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)),
    }));
}

function suggestNextDate(existingDates: Set<string>) {
  const cursor = new Date();
  for (let i = 0; i < 21; i++) {
    const date = formatDateInput(cursor);
    if (!existingDates.has(date)) return date;
    cursor.setDate(cursor.getDate() + 1);
  }
  return formatDateInput(cursor);
}

function GameAvailabilityEditor({
  slots,
  onChange,
}: {
  slots: AvailabilitySlotRow[];
  onChange: (slots: AvailabilitySlotRow[]) => void;
}) {
  const { t } = useI18n();
  const today = formatDateInput(new Date());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [extraDates, setExtraDates] = useState<string[]>([]);

  const dayGroups = useMemo(() => groupSlotsByDate(slots), [slots]);

  const datesWithSlots = useMemo(() => new Set(dayGroups.map((g) => g.date)), [dayGroups]);

  const allDates = useMemo(() => {
    const set = new Set(datesWithSlots);
    for (const date of extraDates) set.add(date);
    return set;
  }, [datesWithSlots, extraDates]);

  const displayGroups = useMemo(() => {
    const pending = extraDates
      .filter((date) => !datesWithSlots.has(date))
      .map((date) => ({ date, slots: [] as AvailabilitySlotRow[] }));

    const merged = [...dayGroups, ...pending].sort((a, b) => a.date.localeCompare(b.date));
    if (merged.length > 0) return merged;
    return [{ date: today, slots: [] as AvailabilitySlotRow[] }];
  }, [dayGroups, extraDates, datesWithSlots, today]);

  const [newDate, setNewDate] = useState(() => suggestNextDate(new Set()));

  useEffect(() => {
    if (allDates.has(newDate)) {
      setNewDate(suggestNextDate(allDates));
    }
  }, [allDates, newDate]);

  const updateSlot = (id: string, patch: Partial<AvailabilitySlotInput>) => {
    onChange(slots.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)));
  };

  const removeSlot = (id: string) => {
    onChange(slots.filter((slot) => slot.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const addSlot = (slot: AvailabilitySlotRow) => {
    onChange([...slots, slot]);
    setExtraDates((prev) => prev.filter((date) => date !== slot.date));
  };

  const addNewDate = () => {
    if (!newDate || allDates.has(newDate)) return;
    setExtraDates((prev) => [...prev, newDate].sort());
    const next = new Set(allDates);
    next.add(newDate);
    setNewDate(suggestNextDate(next));
  };

  return (
    <div className="space-y-3">
      {displayGroups.map((group) => (
        <DayTimelineCard
          key={group.date}
          date={group.date}
          slots={group.slots}
          selectedId={selectedId}
          onSelectId={setSelectedId}
          onAddSlot={addSlot}
          onUpdateSlot={updateSlot}
          onRemoveSlot={removeSlot}
        />
      ))}

      <div className={`${FROSTED_FIELD} p-3 flex flex-wrap items-end gap-2`}>
        <div className="flex-1 min-w-[10rem] space-y-1">
          <label className="text-[10px] font-bold text-amber-100/90">{t("availability.addNewDate")}</label>
          <input
            type="date"
            min={today}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className={`${GAME_INPUT} w-full px-2 py-1.5 text-sm`}
          />
        </div>
        <button
          type="button"
          onClick={addNewDate}
          disabled={!newDate || allDates.has(newDate)}
          className="shrink-0 rounded-xl border-2 border-[#1C1917] bg-white/95 px-4 py-2 text-sm font-bangers tracking-wide text-[#1C1917] comic-shadow-sm hover:bg-amber-50 disabled:opacity-45 disabled:cursor-not-allowed"
        >
          {t("availability.addDay")}
        </button>
      </div>
    </div>
  );
}

function ListAvailabilityEditor({
  slots,
  onChange,
  showHeader,
  isGame,
}: {
  slots: AvailabilitySlotRow[];
  onChange: (slots: AvailabilitySlotRow[]) => void;
  showHeader: boolean;
  isGame: boolean;
}) {
  const { t } = useI18n();

  const updateSlot = (id: string, patch: Partial<AvailabilitySlotInput>) => {
    onChange(slots.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)));
  };

  const removeSlot = (id: string) => {
    onChange(slots.filter((slot) => slot.id !== id));
  };

  return (
    <div className="space-y-3">
      {showHeader && (
        <div
          className={
            isGame
              ? `${FROSTED_FIELD} flex items-start gap-2 p-3`
              : "flex items-start gap-2 border-2 border-black bg-[#FFFBEB] p-3"
          }
        >
          <Clock
            className={[
              "w-4 h-4 mt-0.5 shrink-0",
              isGame ? "text-amber-300" : "text-neutral-800",
            ].join(" ")}
          />
          <div>
            <p
              className={[
                "text-xs font-bold",
                isGame ? "font-bangers text-white tracking-wide" : "text-neutral-800",
              ].join(" ")}
            >
              {t("availability.sectionTitle")}
            </p>
            <p
              className={[
                "text-[10px] font-semibold mt-0.5",
                isGame ? "text-amber-100/85" : "text-neutral-600",
              ].join(" ")}
            >
              {t("availability.sectionHint")}
            </p>
          </div>
        </div>
      )}

      {slots.length === 0 ? (
        <p
          className={[
            "text-xs py-2",
            isGame ? "font-semibold text-amber-100/80" : "text-neutral-500 font-comic",
          ].join(" ")}
        >
          {t("availability.emptyHint")}
        </p>
      ) : (
        <ul className={["space-y-2 pr-1", isGame ? "" : "max-h-56 overflow-y-auto"].join(" ")}>
          {slots.map((slot) => (
            <li
              key={slot.id}
              className={
                isGame
                  ? `${FROSTED_FIELD} flex flex-col sm:flex-row sm:items-end gap-2 p-3`
                  : "flex flex-col sm:flex-row sm:items-center gap-2 p-2 bg-[#FFFBEB] border-2 border-[#1C1917]"
              }
            >
              <div className="flex-1 min-w-0 space-y-1">
                <label className="text-[10px] font-bold text-neutral-600">{t("common.date")}</label>
                <input
                  type="date"
                  value={slot.date}
                  onChange={(e) => updateSlot(slot.id, { date: e.target.value })}
                  className={
                    isGame
                      ? `${GAME_INPUT} px-2 py-1.5 text-sm w-full`
                      : "w-full px-2 py-1.5 text-sm border-2 border-black bg-white font-semibold"
                  }
                />
              </div>
              <div className="w-full sm:w-32 space-y-1">
                <label className="text-[10px] font-bold text-neutral-600">{t("common.start")}</label>
                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => updateSlot(slot.id, { startTime: e.target.value })}
                  className={
                    isGame
                      ? `${GAME_INPUT} px-2 py-1.5 text-sm w-full`
                      : "w-full px-2 py-1.5 text-sm border-2 border-black bg-white font-semibold"
                  }
                />
              </div>
              <div className="w-full sm:w-32 space-y-1">
                <label className="text-[10px] font-bold text-neutral-600">{t("common.end")}</label>
                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => updateSlot(slot.id, { endTime: e.target.value })}
                  className={
                    isGame
                      ? `${GAME_INPUT} px-2 py-1.5 text-sm w-full`
                      : "w-full px-2 py-1.5 text-sm border-2 border-black bg-white font-semibold"
                  }
                />
              </div>
              <button
                type="button"
                onClick={() => removeSlot(slot.id)}
                className="p-1.5 border border-black bg-white hover:bg-rose-100 text-rose-700 shrink-0 self-end sm:mt-5"
                title={t("availability.deleteSlotTitle")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => onChange([...slots, createEmptySlot()])}
        className="w-full text-xs font-bold py-2.5 border-2 border-black bg-white hover:bg-amber-100 flex items-center justify-center gap-1"
      >
        <Plus className="w-3.5 h-3.5" />
        {t("availability.addSlot")}
      </button>
    </div>
  );
}

export function AvailabilityEditor({
  slots,
  onChange,
  showHeader = true,
  variant = "default",
}: AvailabilityEditorProps) {
  if (variant === "game") {
    return <GameAvailabilityEditor slots={slots} onChange={onChange} />;
  }

  return (
    <ListAvailabilityEditor
      slots={slots}
      onChange={onChange}
      showHeader={showHeader}
      isGame={false}
    />
  );
}
