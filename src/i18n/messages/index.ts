import type { Locale } from "../locale";
import { enMessages } from "./en";
import { zhMessages, type Messages } from "./zh";

const catalogs: Record<Locale, Messages> = {
  zh: zhMessages,
  en: enMessages,
};

export function getMessages(locale: Locale): Messages {
  return catalogs[locale];
}

export type { Messages };
export { zhMessages, enMessages };
