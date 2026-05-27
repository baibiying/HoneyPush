"use client";

import type { ReactNode } from "react";
import { LOCALES } from "@/i18n/locale";
import { useI18n } from "@/i18n/i18n-provider";

type LocaleSwitcherProps = {
  className?: string;
  compact?: boolean;
};

export function LocaleSwitcher({ className = "", compact = false }: LocaleSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className={[
        "inline-flex shrink-0 overflow-hidden rounded-md border-2 border-[#1C1917]",
        "shadow-[0_2px_0_#1C1917] bg-[#1C1917]/50",
        className,
      ].join(" ")}
      role="group"
      aria-label={t("locale.switchLabel")}
    >
      {LOCALES.map((loc) => (
        <LocaleButton
          key={loc}
          active={locale === loc}
          compact={compact}
          onClick={() => setLocale(loc)}
        >
          {t(`locale.${loc}`)}
        </LocaleButton>
      ))}
    </div>
  );
}

function LocaleButton({
  active,
  compact,
  onClick,
  children,
}: {
  active: boolean;
  compact?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "font-comic font-bold transition-colors",
        compact ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm sm:px-3 sm:py-1.5 sm:text-base",
        active
          ? "bg-amber-400 text-[#1C1917]"
          : "bg-white/10 text-amber-100/80 hover:bg-white/20",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
