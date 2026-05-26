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
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { request } from "@/lib/api/request";
import { getClientTimezoneOffsetMinutes } from "@/lib/ai/timezone";
import { toDatetimeLocalValue, type ParsedTaskDraft } from "@/lib/ai/parse-task";
import { CATEGORY_OPTIONS } from "./task-edit-dialog";
import {
  FROSTED_FIELD,
  FROSTED_PANEL,
  GAME_INPUT,
  GameField,
  QUADRANT_STYLES,
  SCHEDULE_VIEWPORT,
  ScheduleHubBackground,
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

type TaskAddDialogProps = {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: TaskSubmitPayload) => Promise<void>;
  onSubmitBatch?: (payloads: TaskSubmitPayload[]) => Promise<void>;
};

async function readApiError(res: Response) {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? `请求失败 (${res.status})`;
  } catch {
    return `请求失败 (${res.status})`;
  }
}

export function TaskAddDialog({
  open,
  saving,
  onOpenChange,
  onSubmit,
  onSubmitBatch,
}: TaskAddDialogProps) {
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
    if (!open) return;
    resetForm();
  }, [open]);

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

      const data = (await res.json()) as {
        tasks?: ParsedTaskDraft[];
        source?: "ai" | "fallback";
      };
      const tasks = Array.isArray(data.tasks) ? data.tasks : [];
      if (tasks.length === 0) {
        alert("没能从描述里识别出任务，请补充截止时间或拆成更清晰的句子。");
        return;
      }

      setParsedTasks(tasks);
      setParseSource(data.source === "ai" ? "ai" : "fallback");
      applyParsedToForm(tasks[0], 0);
    } catch (err) {
      alert(err instanceof Error ? err.message : "AI 解析失败，请重试");
    } finally {
      setParsing(false);
    }
  };

  const buildPayload = (): TaskSubmitPayload => ({
    text: text.trim(),
    category,
    durationMinutes,
    deadline: new Date(deadline).toISOString(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !deadline) return;
    await onSubmit(buildPayload());
  };

  const handleSubmitAllParsed = async () => {
    if (parsedTasks.length === 0) return;
    const payloads = parsedTasks.map((task) => ({
      text: task.text,
      category: task.category,
      durationMinutes: task.durationMinutes,
      deadline: task.deadline,
    }));
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName={`${SCHEDULE_VIEWPORT} z-50 bg-transparent`}
        className={`${SCHEDULE_VIEWPORT} z-[100] flex h-auto w-full max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-transparent p-0 shadow-none ring-0 overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0`}
      >
        <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden animate-[fadeIn_0.3s_ease-out]">
          <ScheduleHubBackground />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-white/95 text-[#1C1917] comic-shadow-sm hover:bg-amber-50"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col px-3 pt-3 pb-3 sm:px-5 sm:pt-4 sm:pb-4">
            <DialogHeader className="mb-2 sm:mb-3 shrink-0 items-start text-left space-y-0 pr-12">
              <div className="flex items-center gap-3 sm:gap-4 w-full justify-start">
                <span className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-700 text-white shadow-[0_3px_0_#14532d]">
                  <Plus className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
                </span>
                <div className="min-w-0 text-left">
                  <DialogTitle className="font-bangers text-xl sm:text-2xl text-white tracking-wide drop-shadow-[0_2px_0_#1C1917] text-left">
                    创建任务
                  </DialogTitle>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-1 min-h-0 flex-col gap-3">
              <div className={`flex-1 min-h-0 overflow-hidden p-1 sm:p-2 ${FROSTED_PANEL}`}>
                <div className="h-full min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4">
                  <GameField label="用自然语言描述" icon={MessageSquareText}>
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
                        placeholder="例如：我周五前要交交互设计稿，明天得写完 3000 字论文，今天还得买猫粮"
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
                          {parsing ? "AI 解析中…" : "AI 智能解析"}
                        </Button>
                      </div>
                      {parseSource && (
                        <p className="text-xs sm:text-sm font-bold text-emerald-200">
                          {parseSource === "ai"
                            ? `✓ AI 已识别 ${parsedTasks.length} 个任务，可在下方微调后发布`
                            : `✓ 已用本地规则识别 ${parsedTasks.length} 个任务（AI 未配置时使用）`}
                        </p>
                      )}
                    </div>
                  </GameField>

                  {parsedTasks.length > 0 && (
                    <div className={`space-y-2 p-3 ${FROSTED_FIELD}`}>
                      <p className="font-bangers text-sm sm:text-base text-amber-100 tracking-wide">
                        AI 识别结果
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
                  )}

                  <div className="border-t border-white/20 pt-2">
                    <p className="font-bangers text-sm text-amber-100/90 mb-3 tracking-wide">
                      确认细节（可手动修改）
                    </p>

                    <div className="space-y-4">
                      <GameField label="任务名称" icon={Scroll}>
                        <Input
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          className={`h-12 sm:h-14 text-base sm:text-lg ${GAME_INPUT}`}
                          placeholder="任务标题"
                        />
                      </GameField>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <GameField label="预计用时（分钟）" icon={Clock}>
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

                        <GameField label="截止时间" icon={Calendar}>
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
                            投入哪个象限？
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          {CATEGORY_OPTIONS.map((option) => {
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

              <DialogFooter className="-mx-0 -mb-0 gap-3 border-0 bg-transparent p-0 sm:justify-end shrink-0 flex-col sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="h-12 w-full sm:w-auto rounded-xl border-2 border-[#1C1917] bg-white/95 px-6 font-bold text-[#1C1917] comic-shadow-sm hover:bg-amber-50 comic-btn-push"
                >
                  取消
                </Button>
                {showBatchAdd && (
                  <Button
                    type="button"
                    disabled={saving || parsing}
                    onClick={() => void handleSubmitAllParsed()}
                    className="h-12 w-full sm:w-auto rounded-xl border-2 border-[#1C1917] bg-gradient-to-r from-cyan-400 to-blue-500 px-6 font-bangers text-lg text-[#1C1917] comic-shadow-sm comic-btn-push disabled:opacity-50"
                  >
                    <Sparkles className="h-5 w-5 mr-1.5 inline" />
                    {saving ? "发布中…" : `添加全部 ${parsedTasks.length} 个`}
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={saving || parsing || !canSubmitForm}
                  className="h-12 w-full sm:w-auto rounded-xl border-2 border-[#1C1917] bg-gradient-to-r from-amber-400 via-orange-400 to-[#F15A24] px-8 font-bangers text-xl tracking-wide text-[#1C1917] comic-shadow-sm comic-btn-push hover:from-amber-300 hover:via-orange-300 hover:to-[#e04f1a] disabled:opacity-50"
                >
                  <Plus className="h-5 w-5 mr-1.5 inline" />
                  {saving ? "发布中…" : showBatchAdd ? "仅添加当前这条" : "发布到任务池"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
