import { Suspense } from "react";
import { MonitorScreen } from "@/components/screens/monitor/monitor-screen";

export default function MonitorPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center font-bold text-neutral-500">
          加载监督视窗…
        </div>
      }
    >
      <MonitorScreen />
    </Suspense>
  );
}
