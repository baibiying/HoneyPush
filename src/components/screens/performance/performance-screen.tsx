"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** @deprecated 表现战报已集成到首页地图，此组件仅作兼容跳转 */
export function PerformanceScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/?scene=performance");
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="font-bangers text-xl text-neutral-600">正在返回冒险地图…</p>
    </div>
  );
}
