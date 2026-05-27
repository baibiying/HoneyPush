export const LOCALES = ["zh", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh";
export const LOCALE_STORAGE_KEY = "honeypush-locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "zh" || value === "en";
}

export function localeToHtmlLang(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : "en";
}
