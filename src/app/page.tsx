import { SchedulePageShell } from "@/components/layout/schedule-page-shell";
import { ScheduleScreen } from "@/components/screens/schedule/schedule-screen";

export default function HomePage() {
  return (
    <SchedulePageShell>
      <ScheduleScreen />
    </SchedulePageShell>
  );
}
