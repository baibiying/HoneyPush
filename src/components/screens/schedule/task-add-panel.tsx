"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Loader2,
  MessageSquareText,
  Plus,
  Scroll,
  Sparkles,
  Swords,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { request } from "@/lib/api/request";
import { getClientTimezoneOffsetMinutes } from "@/lib/ai/timezone";
import { toDatetimeLocalValue, type ParsedTaskDraft } from "@/lib/ai/parse-task";
import { useCategoryOptions } from "@/hooks/use-category-options";
import { useI18n } from "@/i18n/i18n-provider";
import {
  FROSTED_FIELD,
  FROSTED_PANEL,
  GAME_INPUT,
  GameField,
  QUADRANT_STYLES,
} from "./task-form-shared";

function defaultDeadlineLocal() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  date.setHours(18, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export type TaskSubmitPayload = {
  text: string;
  category: string;
  durationMinutes: number;
  deadline: string;
};

export type TaskAddPanelProps = {
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: TaskSubmitPayload) => Promise<void>;
  onSubmitBatch?: (payloads: TaskSubmitPayload[]) => Promise<void>;
};

export function TaskAddPanel({
  saving,
  onClose,
  onSubmit,
  onSubmitBatch,
}: TaskAddPanelProps) {
  const { t } = useI18n();
  const categoryOptions = useCategoryOptions();

  const readApiError = async (res: Response) => {
    try {
      const data = (await res.json()) as { error?: string };
      return data.error ?? t("common.requestFailed", { status: res.status });
    } catch {
      return t("common.requestFailed", { status: res.status });
    }
  };

  const [naturalLanguage, setNaturalLanguage] = useState("");
  const [text, setText] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [category, setCategory] = useState("import-noturgent");
  const [deadline, setDeadline] = useState(defaultDeadlineLocal);
  const [parsing, setParsing] = useState(false);
  const [parseSource, setParseSource] = useState<"ai" | "fallback" | null>(null);
  const [parsedTasks, setParsedTasks] = useState<ParsedTaskDraft[]>([]);
  const [activeParsedIndex, setActiveParsedIndex] = useState(0);
  const tzOffset = getClientTimezoneOffsetMinutes();

  const resetForm = () => {
    setNaturalLanguage("");
    setText("");
    setDurationMinutes(25);
    setCategory("import-noturgent");
    setDeadline(defaultDeadlineLocal());
    setParsing(false);
    setParseSource(null);
    setParsedTasks([]);
    setActiveParsedIndex(0);
  };

  useEffect(() => {
    resetForm();
  }, []);

  const applyParsedToForm = (task: ParsedTaskDraft, index: number) => {
    setActiveParsedIndex(index);
    setText(task.text);
    setCategory(task.category);
    setDurationMinutes(task.durationMinutes);
    setDeadline(toDatetimeLocalValue(task.deadline, tzOffset) || defaultDeadlineLocal());
  };

  const handleAiParse = async () => {
    const input = naturalLanguage.trim();
    if (!input) return;
    setParsing(true);
    setParseSource(null);
    try {
      const res = await request("/api/ai-parse-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naturalLanguage: input,
          timezoneOffsetMinutes: tzOffset,
          referenceLocal: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res));
      }
      const data = (await res.json()) as { tasks?: ParsedTaskDraft[]; source?: "ai" | "fallback" };
      const tasks = data.tasks ?? [];
      if (tasks.length === 0) {
        alert(t("tasks.parseNoTasks"));
        return;
      }
      setParsedTasks(tasks);
      setParseSource(data.source ?? "ai");
      applyParsedToForm(tasks[0], 0);
    } catch (err) {
      alert(err instanceof Error ? err.message : t("tasks.parseFailed"));
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !deadline) return;
    await onSubmit({
      text: text.trim(),
      category,
      durationMinutes,
      deadline,
    });
  };

  const handleSubmitAllParsed = async () => {
    const payloads: TaskSubmitPayload[] =
      parsedTasks.length > 0
        ? parsedTasks.map((task) => ({
            text: task.text,
            category: task.category,
            durationMinutes: task.durationMinutes,
            deadline: toDatetimeLocalValue(task.deadline, tzOffset) || defaultDeadlineLocal(),
          }))
        : text.trim() && deadline
          ? [
              {
                text: text.trim(),
                category,
                durationMinutes,
                deadline,
              },
            ]
          : [];

    if (payloads.length === 0) return;

    if (onSubmitBatch) {
      await onSubmitBatch(payloads);
      return;
    }
    for (const payload of payloads) {
      await onSubmit(payload);
    }
  };

  const canSubmitForm = Boolean(text.trim() && deadline);
  const showBatchAdd = parsedTasks.length > 1;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex h-full min-h-0 flex-1 flex-col gap-3">
      <div className={`flex-1 min-h-0 overflow-hidden p-1 sm:p-2 ${FROSTED_PANEL}`}>
        <div className="h-full min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4">
          <GameField label={t("tasks.fieldDescribe")} icon={MessageSquareText}>
            <div className="space-y-2">
              <textarea
                value={naturalLanguage}
                onChange={(e) => setNaturalLanguage(e.target.value)}
                rows={4}
                className={[
                  "w-full resize-none rounded-xl border-2 border-[#1C1917] bg-white/95 px-3 py-3",
                  "text-base sm:text-lg text-[#1C1917] placeholder:text-neutral-400",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                ].join(" ")}
                placeholder={t("tasks.describePlaceholder")}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void handleAiParse()}
                  disabled={parsing || saving || !naturalLanguage.trim()}
                  className="h-11 flex-1 sm:flex-none rounded-xl border-2 border-[#1C1917] bg-gradient-to-r from-violet-500 to-fuchsia-600 px-5 font-bangers text-lg text-white comic-shadow-sm comic-btn-push hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-50"
                >
                  {parsing ? (
                    <Loader2 className="h-5 w-5 mr-1.5 animate-spin inline" />
                  ) : (
                    <Wand2 className="h-5 w-5 mr-1.5 inline" />
                  )}
                  {parsing ? t("tasks.aiParsing") : t("tasks.aiParse")}
                </Button>
              </div>
              {parseSource ? (
                <p className="text-xs sm:text-sm font-bold text-emerald-200">
                  {parseSource === "ai"
                    ? t("tasks.parseOkAi", { count: parsedTasks.length })
                    : t("tasks.parseOkFallback", { count: parsedTasks.length })}
                </p>
              ) : null}
            </div>
          </GameField>

          {parsedTasks.length > 0 ? (
            <div className={`space-y-2 p-3 ${FROSTED_FIELD}`}>
              <p className="font-bangers text-sm sm:text-base text-amber-100 tracking-wide">
                {t("tasks.aiResultsTitle")}
              </p>
              <div className="flex flex-wrap gap-2">
                {parsedTasks.map((task, index) => (
                  <button
                    key={`${task.text}-${index}`}
                    type="button"
                    onClick={() => applyParsedToForm(task, index)}
                    className={[
                      "rounded-lg border-2 px-3 py-2 text-left text-xs sm:text-sm font-bold transition-all comic-btn-push max-w-full",
                      activeParsedIndex === index
                        ? "border-amber-300 bg-amber-300 text-[#1C1917]"
                        : "border-white/40 bg-white/15 text-amber-50 hover:bg-white/25",
                    ].join(" ")}
                  >
                    <span className="line-clamp-2">{task.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="border-t border-white/20 pt-2">
            <p className="font-bangers text-sm text-amber-100/90 mb-3 tracking-wide">
              {t("tasks.confirmDetails")}
            </p>

            <div className="space-y-4">
              <GameField label={t("tasks.fieldName")} icon={Scroll}>
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className={`h-12 sm:h-14 text-base sm:text-lg ${GAME_INPUT}`}
                  placeholder={t("tasks.namePlaceholder")}
                />
              </GameField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <GameField label={t("tasks.fieldDuration")} icon={Clock}>
                  <Input
                    type="number"
                    min={15}
                    max={180}
                    step={5}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value) || 25)}
                    className={`h-11 sm:h-12 tabular-nums ${GAME_INPUT}`}
                  />
                </GameField>

                <GameField label={t("tasks.fieldDeadline")} icon={Calendar}>
                  <Input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                    className={`h-11 sm:h-12 text-sm ${GAME_INPUT}`}
                  />
                </GameField>
              </div>

              <div className={`space-y-3 p-3 sm:p-4 ${FROSTED_FIELD}`}>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#1C1917] bg-gradient-to-br from-violet-400 to-indigo-500 text-white shadow-[0_2px_0_#312e81]">
                    <Swords className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                  <span className="font-bangers text-base sm:text-lg text-white tracking-wide drop-shadow-[0_1px_0_#1C1917]">
                    {t("tasks.quadrantPrompt")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {categoryOptions.map((option) => {
                    const style = QUADRANT_STYLES[option.value];
                    const selected = category === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCategory(option.value)}
                        className={[
                          "text-left rounded-xl border-2 px-3 py-3 sm:py-3.5 transition-all comic-btn-push",
                          selected
                            ? `${style.active} ring-2 ${style.ring}`
                            : "border-white/30 bg-white/15 hover:border-white/50 hover:bg-white/25",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "block text-xs sm:text-sm font-black leading-tight",
                            selected ? "text-[#1C1917]" : "text-amber-50",
                          ].join(" ")}
                        >
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col sm:flex-row gap-3 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-12 w-full sm:w-auto rounded-xl border-2 border-[#1C1917] bg-white/95 px-6 font-bold text-[#1C1917] comic-shadow-sm hover:bg-amber-50 comic-btn-push"
        >
          {t("common.cancel")}
        </Button>
        {showBatchAdd ? (
          <Button
            type="button"
            disabled={saving || parsing}
            onClick={() => void handleSubmitAllParsed()}
            className="h-12 w-full sm:w-auto rounded-xl border-2 border-[#1C1917] bg-gradient-to-r from-cyan-400 to-blue-500 px-6 font-bangers text-lg text-[#1C1917] comic-shadow-sm comic-btn-push disabled:opacity-50"
          >
            <Sparkles className="h-5 w-5 mr-1.5 inline" />
            {saving ? t("tasks.publishing") : t("tasks.addAll", { count: parsedTasks.length })}
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={saving || parsing || !canSubmitForm}
          className="h-12 w-full sm:w-auto rounded-xl border-2 border-[#1C1917] bg-gradient-to-r from-amber-400 via-orange-400 to-[#F15A24] px-8 font-bangers text-xl tracking-wide text-[#1C1917] comic-shadow-sm comic-btn-push hover:from-amber-300 hover:via-orange-300 hover:to-[#e04f1a] disabled:opacity-50"
        >
          <Plus className="h-5 w-5 mr-1.5 inline" />
          {saving
            ? t("tasks.publishing")
            : showBatchAdd
              ? t("tasks.addCurrentOnly")
              : t("tasks.publish")}
        </Button>
      </div>
    </form>
  );
}
