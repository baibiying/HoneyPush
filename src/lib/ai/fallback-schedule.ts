import type { AvailabilitySlotInput } from "./availability";
import { normalizeQuadrantCategory, rankTasksForSchedule } from "./schedule-priority";
import { assignScheduleTimes, type TimedScheduleItem } from "./schedule-times";

export type AiScheduleTask = {
  text: string;
  category: string;
  durationMinutes: number;
};

const CATEGORY_CYCLE = [
  "import-urgent",
  "import-noturgent",
  "notimport-urgent",
  "notimport-noturgent",
] as const;

function guessDurationMinutes(text: string) {
  const hourMatch = text.match(/(\d+)\s*小时/);
  if (hourMatch) return Math.min(120, Math.max(25, Number(hourMatch[1]) * 60));

  const minuteMatch = text.match(/(\d+)\s*分钟/);
  if (minuteMatch) return Math.min(120, Math.max(15, Number(minuteMatch[1])));

  return 25;
}

function guessCategory(text: string, index: number) {
  const lower = text.toLowerCase();
  if (/紧急|ddl|截止|明天|今天|今晚|马上/.test(lower)) return "import-urgent";
  if (/学习|论文|复习|项目|核心|重要/.test(lower)) return "import-noturgent";
  if (/回复|邮件|缴费|取件|快递|联系/.test(lower)) return "notimport-urgent";
  if (/娱乐|刷|买|逛|看剧/.test(lower)) return "notimport-noturgent";
  return CATEGORY_CYCLE[index % CATEGORY_CYCLE.length];
}

export type AiScheduleItem = TimedScheduleItem;

export function buildFallbackScheduleFromTasks(
  tasks: Array<{
    id: number;
    text: string;
    durationMinutes?: number;
    category?: string;
    deadline?: string | null;
  }>,
  availability: AvailabilitySlotInput[],
  timezoneOffsetMinutes?: number
) {
  const deadlinesById = new Map<number, Date | null>();

  const base = tasks.map((task, index) => {
    const deadline = task.deadline ? new Date(task.deadline) : null;
    deadlinesById.set(
      task.id,
      deadline && !Number.isNaN(deadline.getTime()) ? deadline : null
    );
    const category = normalizeQuadrantCategory(
      task.category ?? guessCategory(task.text, index)
    );
    return {
      id: task.id,
      category,
      durationMinutes: task.durationMinutes ?? guessDurationMinutes(task.text),
      order: index + 1,
    };
  });

  const ranked = rankTasksForSchedule(base, deadlinesById);
  return assignScheduleTimes(ranked, deadlinesById, availability, timezoneOffsetMinutes);
}

export function buildFallbackSchedule(input: string): { tasks: AiScheduleTask[] } {
  const normalized = input.trim();
  if (!normalized) return { tasks: [] };

  const parts = normalized
    .split(/[\n，,、；;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const sourceParts = parts.length > 0 ? parts : [normalized];

  const tasks = sourceParts.map((text, index) => ({
    text,
    category: guessCategory(text, index),
    durationMinutes: guessDurationMinutes(text),
  }));

  return { tasks };
}
