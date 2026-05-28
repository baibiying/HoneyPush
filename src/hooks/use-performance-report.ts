"use client";

import { useCallback, useEffect, useState } from "react";
import { request } from "@/lib/api/request";
import { useAuth } from "@/components/auth/auth-provider";
import {
  AUTH_CHANGED_EVENT,
  STATS_CHANGED_EVENT,
  TASKS_CHANGED_EVENT,
} from "@/lib/client-events";
import type { TaskPerformanceReport } from "@/lib/task-performance";

type UsePerformanceReportOptions = {
  /** Defer first fetch so the homepage can paint first. */
  defer?: boolean;
};

export function usePerformanceReport(options: UsePerformanceReportOptions = {}) {
  const { defer = false } = options;
  const { user, loading: authLoading } = useAuth();
  const [report, setReport] = useState<TaskPerformanceReport | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setReport(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await request("/api/performance", { cache: "no-store" });
      if (!res.ok) {
        setReport(null);
        return;
      }
      const data = (await res.json()) as TaskPerformanceReport;
      setReport(data);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    if (!defer) {
      void load();
      return;
    }

    let cancelled = false;
    const run = () => {
      if (!cancelled) void load();
    };

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const timer = window.setTimeout(run, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [authLoading, defer, load]);

  useEffect(() => {
    if (!user) return;

    const refresh = () => {
      void load();
    };
    window.addEventListener(STATS_CHANGED_EVENT, refresh);
    window.addEventListener(TASKS_CHANGED_EVENT, refresh);
    window.addEventListener(AUTH_CHANGED_EVENT, refresh);
    window.addEventListener("online", refresh);
    return () => {
      window.removeEventListener(STATS_CHANGED_EVENT, refresh);
      window.removeEventListener(TASKS_CHANGED_EVENT, refresh);
      window.removeEventListener(AUTH_CHANGED_EVENT, refresh);
      window.removeEventListener("online", refresh);
    };
  }, [user, load]);

  return { report, loading, reload: load, canLoad: Boolean(user) };
}
