import type { Messages } from "./messages";

export type TranslateParams = Record<string, string | number>;

function getNestedString(obj: Messages, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function createTranslator(messages: Messages) {
  return function t(path: string, params?: TranslateParams): string {
    const template = getNestedString(messages, path) ?? path;
    if (!params) return template;
    return Object.entries(params).reduce(
      (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
      template,
    );
  };
}
