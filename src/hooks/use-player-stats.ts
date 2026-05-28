"use client";

import { useEffect, useState } from "react";
import { request } from "@/lib/api/request";
import { useAuth } from "@/components/auth/auth-provider";
import { AUTH_CHANGED_EVENT, STATS_CHANGED_EVENT } from "@/lib/client-events";

export type PlayerStats = {
  totalCoins: number;
};

export function usePlayerStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PlayerStats>({ totalCoins: 0 });

  useEffect(() => {
    let cancelled = false;

    const syncStats = async () => {
      if (!user) {
        if (!cancelled) setStats({ totalCoins: 0 });
        return;
      }

      try {
        const res = await request("/api/stats", { cache: "no-store" });
        if (!res.ok || cancelled) {
          if (!cancelled) setStats({ totalCoins: 0 });
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setStats({
          totalCoins: Number(data?.totalCoins ?? 0),
        });
      } catch {
        if (!cancelled) setStats({ totalCoins: 0 });
      }
    };

    void syncStats();
    const refresh = () => void syncStats();
    window.addEventListener(STATS_CHANGED_EVENT, refresh);
    window.addEventListener(AUTH_CHANGED_EVENT, refresh);
    window.addEventListener("online", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(STATS_CHANGED_EVENT, refresh);
      window.removeEventListener(AUTH_CHANGED_EVENT, refresh);
      window.removeEventListener("online", refresh);
    };
  }, [user]);

  return stats;
}
