"use client";

import { useEffect, useState } from "react";
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

export type ScheduleTask = {
  id: number;
  text: string;
  durationMinutes: number;
  category: string;
  checked: boolean;
  deadline: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
};

export const CATEGORY_OPTIONS = [
  { value: "import-urgent", label: "A · 重要且紧急" },
  { value: "import-noturgent", label: "B · 重要不紧急" },
  { value: "notimport-urgent", label: "C · 紧急不重要" },
  { value: "notimport-noturgent", label: "D · 不重要不紧急" },
];

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
      <DialogContent className="max-w-lg border-4 border-[#1C1917] bg-[#FAF4D3]">
        <DialogHeader>
          <DialogTitle className="font-bangers text-2xl tracking-wide">编辑任务</DialogTitle>
          <DialogDescription>修改任务名称、截止时间、分类和预计用时。</DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-700">任务名称</label>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="h-11 rounded-none border-2 border-black bg-white text-base"
              placeholder="例如：完成交互设计稿"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-700">截止时间</label>
            <Input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="h-11 rounded-none border-2 border-black bg-white text-base"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-700">优先级分类</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 w-full rounded-none border-2 border-black bg-white px-3 text-sm font-semibold"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-700">预计用时（分钟）</label>
            <Input
              title="这件事大概要做多久"
              type="number"
              min={15}
              max={180}
              step={5}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value) || 25)}
              className="h-11 rounded-none border-2 border-black bg-white text-base"
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-none border-2 border-black bg-white font-bold"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={saving || !text.trim() || !deadline}
              className="rounded-none border-2 border-black bg-[#1C1917] font-bold text-white hover:bg-black"
            >
              {saving ? "保存中..." : "保存修改"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
