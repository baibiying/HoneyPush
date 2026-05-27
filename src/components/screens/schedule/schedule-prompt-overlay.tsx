"use client";

import { CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-provider";
import { FROSTED_PANEL, ScheduleHubBackground } from "./task-form-shared";

type SchedulePromptOverlayProps = {
  open: boolean;
  reasons: string[];
  isReschedule: boolean;
  loading: boolean;
  buttonDisabled: boolean;
  buttonLabel: string;
  onSchedule: () => void;
  onViewCalendar: () => void;
};

export function SchedulePromptOverlay({
  open,
  reasons,
  isReschedule,
  loading,
  buttonDisabled,
  buttonLabel,
  onSchedule,
  onViewCalendar,
}: SchedulePromptOverlayProps) {
  const { t } = useI18n();

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-6 animate-[fadeIn_0.2s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-prompt-title"
    >
      <div className="absolute inset-0 bg-[#1e1b4b]/80 backdrop-blur-[3px] rounded-xl" />
      <div className="relative w-full max-w-lg">
        <div className="relative overflow-hidden rounded-2xl border-[3px] border-[#1C1917] comic-shadow">
          <ScheduleHubBackground />
          <div className={`relative border-0 ${FROSTED_PANEL} p-6 sm:p-8 text-center`}>
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-[0_3px_0_#312e81]">
              <CalendarDays className="h-7 w-7" strokeWidth={2.5} />
            </span>
            <h3
              id="schedule-prompt-title"
              className="font-bangers text-2xl sm:text-3xl text-white tracking-wide drop-shadow-[0_2px_0_#1C1917]"
            >
              {isReschedule ? t("calendar.promptReschedule") : t("calendar.promptTitle")}
            </h3>
            <ul className="mt-4 space-y-2.5 text-left max-w-sm mx-auto px-2">
              {reasons.map((reason) => (
                <li
                  key={reason}
                  className="flex items-start gap-3 text-base sm:text-lg font-bold text-amber-50 leading-snug"
                >
                  <span
                    className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-300 border border-[#1C1917]/40"
                    aria-hidden
                  />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                type="button"
                onClick={onSchedule}
                disabled={buttonDisabled || loading}
                className="w-full h-12 sm:h-14 rounded-xl border-2 border-[#1C1917] bg-gradient-to-r from-amber-400 via-orange-400 to-[#F15A24] px-6 font-bangers text-xl sm:text-2xl tracking-wide text-[#1C1917] comic-shadow-sm comic-btn-push hover:from-amber-300 hover:via-orange-300 hover:to-[#e04f1a] disabled:opacity-50 disabled:from-neutral-400 disabled:via-neutral-400 disabled:to-neutral-500 disabled:shadow-none"
              >
                <Sparkles className={`h-5 w-5 sm:h-6 sm:w-6 mr-2 inline ${loading ? "animate-pulse" : ""}`} />
                {buttonLabel}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onViewCalendar}
                disabled={loading}
                className="w-full h-11 sm:h-12 rounded-xl border-2 border-[#1C1917] bg-white/95 px-6 text-base sm:text-lg font-bold text-[#1C1917] comic-shadow-sm hover:bg-amber-50 comic-btn-push disabled:opacity-50"
              >
                {t("calendar.viewCalendar")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
