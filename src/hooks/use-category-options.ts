"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/i18n-provider";

export function useCategoryOptions() {
  const { t, locale } = useI18n();

  return useMemo(
    () => [
      { value: "import-urgent", label: t("tasks.categoryA") },
      { value: "import-noturgent", label: t("tasks.categoryB") },
      { value: "notimport-urgent", label: t("tasks.categoryC") },
      { value: "notimport-noturgent", label: t("tasks.categoryD") },
    ],
    [t, locale],
  );
}
