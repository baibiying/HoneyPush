"use client";

import { ScheduleMainReset } from "@/components/layout/schedule-main-reset";

/** 排期首页全屏紫色背景容器 */
export function SchedulePageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ScheduleMainReset />
      <div
        className={[
          "fixed inset-x-0 top-0 bottom-0 z-[5] flex flex-col overflow-hidden",
          "bg-gradient-to-b from-[#1e1b4b] via-[#4c1d95] to-[#312e81]",
          "pb-[env(safe-area-inset-bottom,0px)] md:pb-0",
        ].join(" ")}
      >
        {children}
      </div>
    </>
  );
}
