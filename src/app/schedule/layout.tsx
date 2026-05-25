import { ScheduleMainReset } from "./schedule-main-reset";

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ScheduleMainReset />
      <div
        className={[
          "fixed inset-x-0 top-[60px] bottom-0 z-[5] flex flex-col overflow-hidden",
          "md:top-[96px]",
          "bg-gradient-to-b from-[#1e1b4b] via-[#4c1d95] to-[#312e81]",
          "pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0",
        ].join(" ")}
      >
        {children}
      </div>
    </>
  );
}
