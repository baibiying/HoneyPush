import { localDateTimeToUtc } from "@/lib/ai/timezone";

export const TASK_CATEGORIES = [
  "import-urgent",
  "import-noturgent",
  "notimport-urgent",
  "notimport-noturgent",
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export type ParsedTaskDraft = {
  text: string;
  category: TaskCategory;
  durationMinutes: number;
  /** ISO 8601 UTC */
  deadline: string;
};

const CATEGORY_SET = new Set<string>(TASK_CATEGORIES);

export function isTaskCategory(value: string): value is TaskCategory {
  return CATEGORY_SET.has(value);
}

export function normalizeParsedTask(
  raw: unknown,
  timezoneOffsetMinutes: number
): ParsedTaskDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as {
    text?: unknown;
    category?: unknown;
    durationMinutes?: unknown;
    deadline?: unknown;
  };

  const rawText = String(row.text ?? "").trim();
  if (!rawText) return null;
  const text = extractTaskTitle(rawText) || rawText;

  const categoryRaw = String(row.category ?? "import-noturgent");
  const category = isTaskCategory(categoryRaw) ? categoryRaw : "import-noturgent";

  const durationMinutes = Number(row.durationMinutes ?? 25);
  const duration = Number.isFinite(durationMinutes)
    ? Math.min(180, Math.max(15, Math.round(durationMinutes)))
    : 25;

  const deadlineDate = parseDeadlineToDate(row.deadline, timezoneOffsetMinutes);
  if (!deadlineDate) return null;

  return {
    text,
    category,
    durationMinutes: duration,
    deadline: deadlineDate.toISOString(),
  };
}

export function normalizeParsedTasks(
  rawList: unknown,
  timezoneOffsetMinutes: number
): ParsedTaskDraft[] {
  if (!Array.isArray(rawList)) return [];
  const out: ParsedTaskDraft[] = [];
  for (const item of rawList) {
    const normalized = normalizeParsedTask(item, timezoneOffsetMinutes);
    if (normalized) out.push(normalized);
  }
  return out;
}

/** 当模型未识别出用时，从用户原句补全预计专注分钟数 */
export function applyDurationFromNaturalLanguage(
  tasks: ParsedTaskDraft[],
  naturalLanguage: string
): ParsedTaskDraft[] {
  const fromInput = extractDurationMinutes(naturalLanguage);
  if (fromInput === 25) return tasks;
  if (tasks.length === 1) {
    return [{ ...tasks[0], durationMinutes: fromInput }];
  }
  return tasks.map((t) =>
    t.durationMinutes === 25 ? { ...t, durationMinutes: fromInput } : t
  );
}

function parseDeadlineToDate(
  value: unknown,
  timezoneOffsetMinutes: number
): Date | null {
  if (value === undefined || value === null || value === "") {
    return defaultDeadline(timezoneOffsetMinutes);
  }
  const str = String(value).trim();
  const iso = new Date(str);
  if (!Number.isNaN(iso.getTime())) return iso;
  return defaultDeadline(timezoneOffsetMinutes);
}

function defaultDeadline(timezoneOffsetMinutes: number): Date {
  const now = new Date();
  const shifted = new Date(now.getTime() - timezoneOffsetMinutes * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate() + 3;
  return localDateTimeToUtc(year, month, day, 18, 0, timezoneOffsetMinutes);
}

function localParts(instant: Date, timezoneOffsetMinutes: number) {
  const shifted = new Date(instant.getTime() - timezoneOffsetMinutes * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

function deadlineFromPhrase(
  phrase: string,
  timezoneOffsetMinutes: number,
  now = new Date()
): Date | null {
  const p = phrase.trim();
  const parts = localParts(now, timezoneOffsetMinutes);
  let dayOffset = 0;
  let hour = 18;
  const minute = 0;

  if (/今晚|今天晚上/.test(p)) {
    dayOffset = 0;
    hour = 22;
  } else if (/今天|今日/.test(p)) {
    dayOffset = 0;
    hour = 18;
  } else if (/明天|明日/.test(p)) {
    dayOffset = 1;
  } else if (/后天/.test(p)) {
    dayOffset = 2;
  } else if (/大后天/.test(p)) {
    dayOffset = 3;
  } else if (/下周五|下个周五/.test(p)) {
    const target = 5;
    dayOffset = (7 - parts.weekday + target) % 7 || 7;
  } else if (/下周/.test(p)) {
    dayOffset = (7 - parts.weekday) % 7 || 7;
  } else {
    const weekdayMap: Record<string, number> = {
      一: 1,
      二: 2,
      三: 3,
      四: 4,
      五: 5,
      六: 6,
      日: 0,
      天: 0,
    };
    const weekMatch = p.match(/(?:周|星期)([一二三四五六日天])/);
    if (weekMatch) {
      const target = weekdayMap[weekMatch[1]] ?? parts.weekday;
      dayOffset = (target - parts.weekday + 7) % 7 || (target <= parts.weekday ? 7 : 0);
    }
  }

  const dateMatch = p.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日?/);
  if (dateMatch) {
    const month = Number(dateMatch[1]);
    const day = Number(dateMatch[2]);
    let year = parts.year;
    if (month < parts.month || (month === parts.month && day < parts.day)) {
      year += 1;
    }
    return localDateTimeToUtc(year, month, day, hour, minute, timezoneOffsetMinutes);
  }

  if (dayOffset > 0 || /今天|今晚|明日|明天|周|星期/.test(p)) {
    const base = localDateTimeToUtc(
      parts.year,
      parts.month,
      parts.day,
      0,
      0,
      timezoneOffsetMinutes
    );
    const target = new Date(base.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const tp = localParts(target, timezoneOffsetMinutes);
    return localDateTimeToUtc(tp.year, tp.month, tp.day, hour, minute, timezoneOffsetMinutes);
  }

  return null;
}

const DURATION_HINT =
  /(?:大概|约|大约|预计|需要|花费|用时|要)?\s*/i;

const CN_HOUR_NUM: Record<string, number> = {
  两: 2,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

/** 从自然语言中提取预计专注用时（分钟），默认 25 */
export function extractDurationMinutes(text: string): number {
  const hourMatch = text.match(
    new RegExp(
      `${DURATION_HINT.source}(\\d+(?:\\.\\d+)?)\\s*(?:个)?\\s*(?:小时|钟头|h|hr)`,
      "i"
    )
  );
  if (hourMatch) {
    return Math.min(180, Math.max(15, Math.round(Number(hourMatch[1]) * 60)));
  }

  const cnHourMatch = text.match(
    /(?:大概|约|大约|预计|需要|花费|用时)?\s*(两|二|三|四|五|六|七|八|九|十)\s*(?:个)?\s*(?:小时|钟头)/i
  );
  if (cnHourMatch) {
    const hours = CN_HOUR_NUM[cnHourMatch[1]] ?? 2;
    return Math.min(180, Math.max(15, hours * 60));
  }

  const minMatch = text.match(
    new RegExp(
      `${DURATION_HINT.source}(\\d+)\\s*(?:分钟|分(?!析|为|类|享|配|钟)|min)`,
      "i"
    )
  );
  if (minMatch) {
    return Math.min(180, Math.max(15, Number(minMatch[1])));
  }
  return 25;
}

function resolveDurationMinutes(segment: string, fullInput: string): number {
  const fromSegment = extractDurationMinutes(segment);
  if (fromSegment !== 25) return fromSegment;
  return extractDurationMinutes(fullInput);
}

function guessCategory(text: string): TaskCategory {
  const t = text.toLowerCase();
  if (/紧急|火急|ddl|截止|今晚必须|马上/.test(t)) return "import-urgent";
  if (/重要|论文|考试|面试|交付/.test(t)) return "import-noturgent";
  if (/顺便|买|取快递|回消息/.test(t)) return "notimport-noturgent";
  if (/催|临时|尽快/.test(t)) return "notimport-urgent";
  return "import-noturgent";
}

function cleanTaskText(segment: string): string {
  return segment
    .replace(/[，,；;。！？!?]+$/g, "")
    .replace(/^(还要|另外|以及|并且|然后|再)+/g, "")
    .trim();
}

/** 常见任务动词前缀（长词优先），剥离后保留事项名称，如「写完英语语法作业」→「英语语法作业」 */
const TASK_ACTION_PREFIXES = [
  "认认真真写完",
  "认认真真完成",
  "尽快完成",
  "赶紧做完",
  "赶紧完成",
  "写完",
  "写好",
  "做完",
  "做好",
  "复习完",
  "背完",
  "读完",
  "看完",
  "听完",
  "处理完",
  "搞定",
  "弄完",
  "搞完",
  "完成",
  "提交",
  "上交",
  "交付",
  "交给",
  "撰写",
  "编写",
  "复习",
  "预习",
  "背诵",
  "阅读",
  "观看",
  "听取",
  "处理",
  "整理",
  "准备",
  "开始",
  "继续",
  "背",
  "读",
  "看",
  "听",
  "写",
  "做",
  "交",
  "回",
  "发",
  "买",
  "取",
  "送",
  "修",
  "改",
  "画",
  "练",
];

function stripTaskActionVerbs(title: string): string {
  let t = title.trim();
  if (t.length < 2) return t;

  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of TASK_ACTION_PREFIXES) {
      if (!t.startsWith(prefix)) continue;
      const rest = t.slice(prefix.length).trim();
      if (rest.length >= 2) {
        t = rest;
        changed = true;
        break;
      }
    }
  }
  return t;
}

/** 从整句描述中剥离截止时间与预计用时，只保留任务名称 */
export function extractTaskTitle(raw: string): string {
  let t = cleanTaskText(raw);
  if (!t) return "";

  t = t.replace(
    /(?:大概|约|大约|预计|需要|花费|用时)?\s*\d+(?:\.\d+)?\s*(?:个小时|小时|h|hr)/gi,
    " "
  );
  t = t.replace(
    /(?:大概|约|大约|预计|需要|花费|用时)?\s*\d+\s*(?:分钟|分(?!析|为|类|享|配|钟)|min)/gi,
    " "
  );

  const timePhrasePatterns = [
    /(?:大)?后天(?:晚上|下午|上午|早晨|凌晨)?/gi,
    /(?:今天|今日)(?:晚上|下午|上午|早晨|凌晨)?/gi,
    /今晚/gi,
    /明(?:天|日)(?:晚上|下午|上午|早晨)?/gi,
    /下(?:个)?周[一二三四五六日天](?:晚上|下午|上午)?/gi,
    /(?:周|星期)[一二三四五六日天](?:晚上|下午|上午)?\s*(?:前|之前|以内|内|截止)?/gi,
    /截止(?:时间|日期)?/gi,
    /\d{1,2}\s*月\s*\d{1,2}\s*日?(?:前|之前|以内|内)?/gi,
    /\d{1,2}\s*号(?:前|之前|以内|内)?/gi,
    /截(?:止|至)(?:日期|时间)?[是为]?\s*/gi,
    /\bddl\b\s*[:：]?\s*/gi,
  ];
  for (const re of timePhrasePatterns) {
    t = t.replace(re, " ");
  }

  t = t.replace(
    /(?:下(?:个)?周[一二三四五六日天]|(?:周|星期)[一二三四五六日天])\s*前/gi,
    " "
  );

  t = t.replace(/\s+/g, " ").trim();

  t = t.replace(/^(?:我|我们|还得|还要|先|再|然后|另外|以及|并且)\s*/g, "");
  t = t.replace(/^(?:要|得|需要|必须|打算|准备|想|想要)\s*/g, "");

  t = t.replace(/[，,、]\s*(?:大概|约|大约|预计|需要)?\s*\d+(?:\.\d+)?\s*(?:个小时|小时|h|hr|分钟|分(?!析|为|类|享|配|钟)|min)?/gi, "");
  t = t.replace(/\s*(?:前|之前|以内|内)\s*$/g, "");
  t = t.replace(/\s*(?:大概|约|大约|预计)\s*$/g, "");

  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/^[，,、；;]\s*|[，,、；;]\s*$/g, "");

  t = stripTaskActionVerbs(t);

  if (t.length >= 2) return t;

  let fallback = cleanTaskText(raw);
  fallback = fallback.replace(/\d+(?:\.\d+)?\s*(?:个小时|小时|h)/gi, " ");
  fallback = fallback.replace(/\d+\s*(?:分钟|分(?!析|为|类|享|配|钟)|min)/gi, " ");
  fallback = fallback.replace(/\s+/g, " ").trim();
  return fallback.length >= 2 ? fallback : cleanTaskText(raw);
}

/**
 * 无 LLM 时的规则解析：按标点拆分多条，提取截止时间关键词与时长。
 */
export function fallbackParseTasksFromNaturalLanguage(
  input: string,
  timezoneOffsetMinutes: number
): ParsedTaskDraft[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const segments = trimmed
    .split(
      /[；;。\n]+|[,，](?=\s*[^,，]*(?:要|得|需要(?:完成|做|写|交|弄)|完成|写|交|做))/
    )
    .map(cleanTaskText)
    .filter((s) => s.length >= 2);

  const parts = segments.length > 0 ? segments : [trimmed];

  return parts.map((segment) => {
    const deadline =
      deadlineFromPhrase(segment, timezoneOffsetMinutes) ??
      deadlineFromPhrase(trimmed, timezoneOffsetMinutes) ??
      defaultDeadline(timezoneOffsetMinutes);
    return {
      text: extractTaskTitle(segment) || cleanTaskText(segment),
      category: guessCategory(`${segment} ${trimmed}`),
      durationMinutes: resolveDurationMinutes(segment, trimmed),
      deadline: deadline.toISOString(),
    };
  });
}

export function toDatetimeLocalValue(iso: string, timezoneOffsetMinutes: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() - timezoneOffsetMinutes * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}
