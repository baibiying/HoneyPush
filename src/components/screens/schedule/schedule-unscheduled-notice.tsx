"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-provider";
import { FROSTED_PANEL, ScheduleHubBackground } from "./task-form-shared";

type ScheduleUnscheduledNoticeProps = {
  open: boolean;
  scheduledCount: number;
  taskNames: string[];
  onDismiss: () => void;
};

export function ScheduleUnscheduledNotice({
  open,
  scheduledCount,
  taskNames,
  onDismiss,
}: ScheduleUnscheduledNoticeProps) {
  const { t } = useI18n();

  if (!open || taskNames.length === 0) return null;

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-6 animate-[fadeIn_0.2s_ease-out]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="schedule-unscheduled-title"
    >
      <div className="absolute inset-0 bg-[#1e1b4b]/75 backdrop-blur-[2px] rounded-xl" />
      <div className="relative w-full max-w-lg">
        <div className="relative overflow-hidden rounded-2xl border-[3px] border-[#1C1917] comic-shadow">
          <ScheduleHubBackground />
          <div className={`relative border-0 ${FROSTED_PANEL} p-6 sm:p-8`}>
            <div className="flex flex-col items-center text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-gradient-to-br from-amber-400 to-orange-500 text-[#1C1917] shadow-[0_3px_0_#92400e]">
                <AlertTriangle className="h-7 w-7" strokeWidth={2.5} />
              </span>
              <h3
                id="schedule-unscheduled-title"
                className="font-bangers text-2xl sm:text-3xl text-white tracking-wide drop-shadow-[0_2px_0_#1C1917]"
              >
                {t("calendar.noticeTitle")}
              </h3>
              <p className="mt-3 text-base sm:text-lg font-black text-amber-50 leading-snug max-w-md">
                {t("calendar.noticeBody", { scheduled: scheduledCount })}
              </p>
              <p className="mt-2 text-sm sm:text-base font-bold text-amber-100/90 leading-snug max-w-md">
                {t("calendar.noticeList", { count: taskNames.length })}
              </p>
              <ul className="mt-4 w-full max-w-sm space-y-2 text-left px-2">
                {taskNames.map((name, index) => (
                  <li
                    key={`${index}-${name}`}
                    className="flex items-start gap-3 text-sm sm:text-base font-bold text-amber-50 leading-snug"
                  >
                    <span
                      className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-300 border border-[#1C1917]/40"
                      aria-hidden
                    />
                    <span className="line-clamp-2">{name}</span>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                onClick={onDismiss}
                className="mt-6 w-full h-11 sm:h-12 rounded-xl border-2 border-[#1C1917] bg-white/95 px-6 text-base sm:text-lg font-bold text-[#1C1917] comic-shadow-sm hover:bg-amber-50 comic-btn-push"
              >
                {t("calendar.noticeOk")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
