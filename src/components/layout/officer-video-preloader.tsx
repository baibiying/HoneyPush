"use client";

import { useEffect } from "react";
import {
  PREFERRED_OFFICER_CHANGED_EVENT,
  readPreferredOfficer,
} from "@/lib/preferred-officer";
import {
  preloadOfficerVideosCritical,
} from "@/lib/officers/preload-officer-videos";

const PRELOAD_DELAY_MS = 5_000;

/** 延后预加载，避免与登录/注册 API 争抢带宽与连接。 */
export function OfficerVideoPreloader() {
  useEffect(() => {
    let cancelled = false;

    const warm = () => {
      if (cancelled) return;
      const id = readPreferredOfficer();
      if (id) void preloadOfficerVideosCritical(id);
    };

    const scheduleWarm = () => {
      if (cancelled) return;
      warm();
    };

    const delayTimer = window.setTimeout(scheduleWarm, PRELOAD_DELAY_MS);

    const onPreferredChanged = () => {
      window.clearTimeout(delayTimer);
      scheduleWarm();
    };

    window.addEventListener(PREFERRED_OFFICER_CHANGED_EVENT, onPreferredChanged);
    return () => {
      cancelled = true;
      window.clearTimeout(delayTimer);
      window.removeEventListener(PREFERRED_OFFICER_CHANGED_EVENT, onPreferredChanged);
    };
  }, []);

  return null;
}
