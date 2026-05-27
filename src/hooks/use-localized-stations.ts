"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/i18n-provider";
import { STATIONS, type StationConfig } from "@/components/screens/schedule/schedule-stations";

const STATION_MESSAGE_KEYS = [
  { title: "stations.createTask.title", subtitle: "stations.createTask.subtitle" },
  { title: "stations.viewTasks.title", subtitle: "stations.viewTasks.subtitle" },
  { title: "stations.availability.title", subtitle: "stations.availability.subtitle" },
  { title: "stations.aiSchedule.title", subtitle: "stations.aiSchedule.subtitle" },
  { title: "stations.officer.title", subtitle: "stations.officer.subtitle" },
] as const;

export function useLocalizedStations(): StationConfig[] {
  const { t, locale } = useI18n();

  return useMemo(
    () =>
      STATIONS.map((station, index) => {
        const keys = STATION_MESSAGE_KEYS[index];
        if (!keys) return station;
        return {
          ...station,
          title: t(keys.title),
          subtitle: t(keys.subtitle),
        };
      }),
    [t, locale],
  );
}
