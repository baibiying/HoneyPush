"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/i18n-provider";
import {
  getQuadrantMeta,
  type QuadrantKey,
} from "@/components/screens/schedule/quadrants";

export function useLocalizedQuadrant(key: QuadrantKey) {
  const { t, locale } = useI18n();
  const base = getQuadrantMeta(key);

  return useMemo(
    () => ({
      ...base,
      title: t(`quadrants.${key}.title`),
      subtitle: t(`quadrants.${key}.subtitle`),
    }),
    [base, key, t, locale],
  );
}
