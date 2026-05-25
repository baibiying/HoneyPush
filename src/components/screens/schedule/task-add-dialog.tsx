"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Calendar, Clock, Mic, Plus, Scroll, Sparkles, Swords, X } from "lucide-react";
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
import { CATEGORY_OPTIONS } from "./task-edit-dialog";

/** 与 schedule layout、四象限页相同的可视区域（不覆盖顶栏导航） */
const SCHEDULE_VIEWPORT =
  "fixed inset-x-0 top-[60px] md:top-[96px] bottom-0 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0";

/** 与 schedule-game-hub 一致的紫色渐变 + 白点星空底 */
const SCHEDULE_HUB_STARFIELD = {
  backgroundImage:
    "radial-gradient(circle at 15% 20%, rgba(251,191,36,0.25) 0%, transparent 40%), radial-gradient(circle at 85% 75%, rgba(56,189,248,0.2) 0%, transparent 45%), radial-gradient(white 1px, transparent 1px)",
  backgroundSize: "auto, auto, 24px 24px",
} as const;

function ScheduleHubBackground() {
  return (
    <>
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#1e1b4b] via-[#4c1d95] to-[#312e81]"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-40"
        style={SCHEDULE_HUB_STARFIELD}
        aria-hidden
      />
    </>
  );
}

/** 与四象限内容区一致的紫色磨砂面板 */
const FROSTED_PANEL =
  "rounded-xl border-2 border-white/20 bg-black/20 backdrop-blur-[2px]";

const FROSTED_FIELD =
  "rounded-xl border border-white/25 bg-white/10 backdrop-blur-sm";

const GAME_INPUT =
  "rounded-xl border-2 border-[#1C1917] bg-[#FFFBF0] text-[#1C1917] font-bold shadow-[inset_2px_2px_0_rgba(28,25,23,0.08)] focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-300/80";

const QUADRANT_STYLES: Record<
  string,
  { ring: string; bg: string; active: string; tag: string }
> = {
  "import-urgent": {
    ring: "ring-orange-500",
    bg: "from-orange-400 to-amber-500",
    active: "border-[#1C1917] bg-gradient-to-br from-orange-200 to-amber-100 comic-shadow-sm scale-[1.02]",
    tag: "Q1",
  },
  "import-noturgent": {
    ring: "ring-emerald-500",
    bg: "from-emerald-400 to-green-500",
    active: "border-[#1C1917] bg-gradient-to-br from-emerald-200 to-green-100 comic-shadow-sm scale-[1.02]",
    tag: "Q2",
  },
  "notimport-urgent": {
    ring: "ring-lime-500",
    bg: "from-lime-400 to-green-400",
    active: "border-[#1C1917] bg-gradient-to-br from-lime-200 to-green-100 comic-shadow-sm scale-[1.02]",
    tag: "Q3",
  },
  "notimport-noturgent": {
    ring: "ring-sky-500",
    bg: "from-sky-400 to-cyan-500",
    active: "border-[#1C1917] bg-gradient-to-br from-sky-200 to-cyan-100 comic-shadow-sm scale-[1.02]",
    tag: "Q4",
  },
};

function defaultDeadlineLocal() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  date.setHours(18, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type TaskAddDialogProps = {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    text: string;
    category: string;
    durationMinutes: number;
    deadline: string;
  }) => Promise<void>;
};

function GameField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof Clock;
  children: ReactNode;
}) {
  return (
    <div className={`${FROSTED_FIELD} p-3 sm:p-3.5`}>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#1C1917] bg-gradient-to-br from-amber-300 to-orange-400 text-[#1C1917] shadow-[0_2px_0_#1C1917]">
          <Icon className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <label className="font-bangers text-base text-white tracking-wide drop-shadow-[0_1px_0_#1C1917]">
          {label}
        </label>
      </div>
      {children}
    </div>
  );
}

export function TaskAddDialog({ open, saving, onOpenChange, onSubmit }: TaskAddDialogProps) {
  const [text, setText] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [category, setCategory] = useState("import-noturgent");
  const [deadline, setDeadline] = useState(defaultDeadlineLocal);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (!open) return;
    setText("");
    setDurationMinutes(25);
    setCategory("import-noturgent");
    setDeadline(defaultDeadlineLocal());
    setListening(false);
  }, [open]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const handleVoiceInput = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    // @ts-expect-error SpeechRecognition 实验性 API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("当前浏览器不支持语音输入，推荐使用 Chrome 浏览器");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: {
      results: { [key: number]: { [key: number]: { transcript: string } } };
    }) => {
      const transcript = event.results[0][0].transcript.trim();
      if (!transcript) return;
      setListening(false);
      setText(transcript);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !deadline) return;

    await onSubmit({
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
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col px-3 pt-3 pb-3 sm:px-5 sm:pt-4 sm:pb-4">
            <DialogHeader className="mb-2 sm:mb-3 shrink-0 items-start text-left space-y-0 pr-12">
              <div className="flex items-center gap-3 sm:gap-4 w-full justify-start">
                <span className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-[0_3px_0_#0f766e]">
                  <Plus className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={3} />
                </span>
                <div className="min-w-0 text-left">
                  <DialogTitle className="font-bangers text-xl sm:text-2xl text-white tracking-wide drop-shadow-[0_2px_0_#1C1917] text-left">
                    创建任务
                  </DialogTitle>
                  <DialogDescription className="text-[10px] sm:text-xs font-semibold text-amber-100/85 mt-0.5 text-left">
                    填写任务情报，发布后在「查看任务」中浏览
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-1 min-h-0 flex-col gap-3">
              <div className={`flex-1 min-h-0 overflow-hidden p-1 sm:p-2 ${FROSTED_PANEL}`}>
                <div className="h-full min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4">
                <GameField label="任务名称" icon={Scroll}>
                  <div className="flex gap-2">
                    <Input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className={`h-12 sm:h-14 flex-1 text-base sm:text-lg ${GAME_INPUT}`}
                      placeholder="例如：完成交互设计稿"
                      autoFocus
                    />
                    <Button
                      type="button"
                      onClick={handleVoiceInput}
                      className={[
                        "h-12 sm:h-14 shrink-0 rounded-xl border-2 border-[#1C1917] px-3 font-bangers text-sm comic-shadow-sm comic-btn-push",
                        listening
                          ? "bg-rose-500 text-white animate-pulse shadow-[0_3px_0_#9f1239]"
                          : "bg-[#1C1917] text-amber-200 hover:bg-black",
                      ].join(" ")}
                      title="语音填写任务名"
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                  </div>
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
                      title="这件事大概要做多久"
                      placeholder="25"
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
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !text.trim() || !deadline}
                  className="h-12 flex-1 sm:flex-none rounded-xl border-2 border-[#1C1917] bg-gradient-to-r from-amber-400 via-orange-400 to-[#F15A24] px-8 font-bangers text-xl tracking-wide text-[#1C1917] comic-shadow-sm comic-btn-push hover:from-amber-300 hover:via-orange-300 hover:to-[#e04f1a] disabled:opacity-50 disabled:from-neutral-400 disabled:via-neutral-400 disabled:to-neutral-500 disabled:shadow-none"
                >
                  <Sparkles className="h-5 w-5 mr-1.5 inline" />
                  {saving ? "发布中..." : "发布到任务池"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
