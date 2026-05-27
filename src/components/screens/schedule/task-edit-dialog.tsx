"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, Pencil, Scroll, Sparkles, Swords, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCategoryOptions } from "@/hooks/use-category-options";
import { useI18n } from "@/i18n/i18n-provider";
import {
  FROSTED_FIELD,
  FROSTED_PANEL,
  GAME_INPUT,
  GameField,
  QUADRANT_STYLES,
  SCHEDULE_VIEWPORT,
  ScheduleHubBackground,
} from "./task-form-shared";

export type ScheduleTask = {
  id: number;
  text: string;
  durationMinutes: number;
  category: string;
  checked: boolean;
  deadline: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  scheduledFocusSegments?: Array<{ startAt: string; endAt: string }> | null;
};

function toDatetimeLocalValue(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type TaskEditDialogProps = {
  task: ScheduleTask | null;
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: {
    text: string;
    category: string;
    durationMinutes: number;
    deadline: string;
  }) => Promise<void>;
};

export function TaskEditDialog({
  task,
  open,
  saving,
  onOpenChange,
  onSave,
}: TaskEditDialogProps) {
  const { t } = useI18n();
  const categoryOptions = useCategoryOptions();
  const [text, setText] = useState("");
  const [category, setCategory] = useState("import-urgent");
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    if (!task || !open) return;
    setText(task.text);
    setCategory(task.category);
    setDurationMinutes(task.durationMinutes);
    setDeadline(toDatetimeLocalValue(task.deadline));
  }, [task, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !deadline) return;

    await onSave({
      text: text.trim(),
      category,
      durationMinutes,
      deadline: new Date(deadline).toISOString(),
    });
  };

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
            aria-label={t("common.close")}
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col px-3 pt-3 pb-3 sm:px-5 sm:pt-4 sm:pb-4">
            <DialogHeader className="mb-2 sm:mb-3 shrink-0 items-start text-left space-y-0 pr-12">
              <div className="flex items-center gap-3 sm:gap-4 w-full justify-start">
                <span className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-gradient-to-br from-sky-400 to-indigo-600 text-white shadow-[0_3px_0_#312e81]">
                  <Pencil className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
                </span>
                <div className="min-w-0 text-left">
                  <DialogTitle className="font-bangers text-xl sm:text-2xl text-white tracking-wide drop-shadow-[0_2px_0_#1C1917] text-left">
                    {t("tasks.editTitle")}
                  </DialogTitle>
                  <DialogDescription className="text-[10px] sm:text-xs font-semibold text-amber-100/85 mt-0.5 text-left">
                    {t("tasks.editSubtitle")}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-1 min-h-0 flex-col gap-3">
              <div className={`flex-1 min-h-0 overflow-hidden p-1 sm:p-2 ${FROSTED_PANEL}`}>
                <div className="h-full min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4">
                  <GameField label={t("tasks.fieldName")} icon={Scroll}>
                    <Input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className={`h-12 sm:h-14 text-base sm:text-lg ${GAME_INPUT}`}
                      placeholder={t("tasks.editNamePlaceholder")}
                      autoFocus
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
                        title={t("tasks.durationTitle")}
                        placeholder="25"
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
                            <span className="flex items-center gap-1.5 mb-1">
                              <span
                                className={[
                                  "font-bangers text-[10px] px-1.5 py-0.5 rounded border border-[#1C1917] text-[#1C1917]",
                                  selected ? "bg-amber-300" : "bg-white/90",
                                ].join(" ")}
                              >
                                {style.tag}
                              </span>
                              <span
                                className={[
                                  "inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-r border border-[#1C1917]/50",
                                  style.bg,
                                ].join(" ")}
                              />
                            </span>
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

              <DialogFooter className="-mx-0 -mb-0 gap-3 border-0 bg-transparent p-0 sm:justify-end shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="h-12 flex-1 sm:flex-none rounded-xl border-2 border-[#1C1917] bg-white/95 px-6 font-bold text-[#1C1917] comic-shadow-sm hover:bg-amber-50 comic-btn-push"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !text.trim() || !deadline}
                  className="h-12 flex-1 sm:flex-none rounded-xl border-2 border-[#1C1917] bg-gradient-to-r from-amber-400 via-orange-400 to-[#F15A24] px-8 font-bangers text-xl tracking-wide text-[#1C1917] comic-shadow-sm comic-btn-push hover:from-amber-300 hover:via-orange-300 hover:to-[#e04f1a] disabled:opacity-50 disabled:from-neutral-400 disabled:via-neutral-400 disabled:to-neutral-500 disabled:shadow-none"
                >
                  <Sparkles className="h-5 w-5 mr-1.5 inline" />
                  {saving ? t("tasks.saving") : t("tasks.save")}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
