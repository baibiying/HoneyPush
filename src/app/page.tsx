import { Suspense } from "react";
import { SchedulePageShell } from "@/components/layout/schedule-page-shell";
import { ScheduleScreen } from "@/components/screens/schedule/schedule-screen";

export default function HomePage() {
  return (
    <SchedulePageShell>
      <Suspense fallback={null}>
        <ScheduleScreen />
      </Suspense>
    </SchedulePageShell>
  );
}
