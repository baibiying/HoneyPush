import { NextRequest, NextResponse } from "next/server";
import {
  buildFallbackScheduleFromTasks,
  type AiScheduleItem,
} from "@/lib/ai/fallback-schedule";
import {
  parseAvailabilityFromBody,
  parseTimezoneOffsetMinutes,
} from "@/lib/ai/availability";
import {
  extractJsonObject,
  isLlmConfigured,
  llmChatCompletion,
} from "@/lib/ai/llm-chat";
import { rankTasksForSchedule } from "@/lib/ai/schedule-priority";
import { assignScheduleTimes } from "@/lib/ai/schedule-times";
import { requireUser } from "@/lib/auth/session";
import { isTaskPastDeadline } from "@/lib/schedule-execution";

const VALID_CATEGORIES = new Set([
  "import-urgent",
  "import-noturgent",
  "notimport-urgent",
  "notimport-noturgent",
]);

const SYSTEM_PROMPT = `你是一个效率规划专家，擅长根据任务截止时间、预计用时、四象限优先级和用户可用时间段，为用户已有的任务列表做排期。
排期硬性规则（由系统自动落实，你只需给出顺序与时长）：
1. 任务只能排在用户 availability 内；今天排不下则排到明天或更晚的可用时段。
2. 每个任务按番茄钟拆分：专注 25 分钟 + 休息 5 分钟循环，直到完成预计专注时长；休息不占任务色块，但会消耗可用时段。
3. 不同任务之间至少间隔 10 分钟（由系统自动留出）。
4. durationMinutes 表示该任务预计需要的专注分钟数（用户填写的「预计用时」），不是连续占满一整段。
用户会提供 availability（今天及未来几天可用于做事的日期与时段）和 tasks。
用户会提供一组已经创建的任务（包含 id、text、durationMinutes、deadline、category 等），你需要：
1. 为每个任务确认或调整四象限类别（category）：
   - import-urgent（A：重要且紧急）
   - import-noturgent（B：重要不紧急）
   - notimport-urgent（C：紧急不重要）
   - notimport-noturgent（D：不重要不紧急）
2. 为每个任务确认或调整合理的 durationMinutes（15-180，表示预计完成用时，默认 25）
3. 给出建议执行顺序 order（从1开始，数字越小越优先）。优先级须综合考虑：
   - 第一优先：四象限 — Q1重要且紧急(import-urgent) > Q4紧急不重要(notimport-urgent) > Q2重要不紧急(import-noturgent) > Q3不重要不紧急(notimport-noturgent)
   - 第二优先：同一象限内 deadline 越早越靠前
   - 第三优先：预计用时更紧、更关键的任务可适当提前
   （系统会按上述规则再次排序后落日历，请与 category 一致地给出 order）
4. 必须保留用户提供的每个 id，不要新增或删除任务
5. 返回 JSON：{"schedule":[{"id":1,"category":"import-urgent","durationMinutes":25,"order":1}]}
只返回 JSON，不要其他说明文字。具体开始/结束时间由系统根据 availability 与番茄钟规则自动生成。`;

type IncomingTask = {
  id: number;
  text: string;
  durationMinutes?: number;
  category?: string;
  deadline?: string | null;
};

function buildDeadlinesMap(sourceTasks: IncomingTask[]) {
  const map = new Map<number, Date | null>();
  for (const task of sourceTasks) {
    if (!task.deadline) {
      map.set(task.id, null);
      continue;
    }
    const date = new Date(task.deadline);
    map.set(task.id, Number.isNaN(date.getTime()) ? null : date);
  }
  return map;
}

function normalizeSchedule(
  raw: unknown,
  sourceTasks: IncomingTask[],
  availability: import("@/lib/ai/availability").AvailabilitySlotInput[],
  timezoneOffsetMinutes: number
): { schedule: AiScheduleItem[]; unscheduledIds: number[] } {
  const deadlinesById = buildDeadlinesMap(sourceTasks);

  const baseFromFallback = () =>
    buildFallbackScheduleFromTasks(sourceTasks, availability, timezoneOffsetMinutes);

  if (!raw || typeof raw !== "object" || !("schedule" in raw)) {
    return baseFromFallback();
  }

  const schedule = (raw as { schedule: unknown }).schedule;
  if (!Array.isArray(schedule)) {
    return baseFromFallback();
  }

  const byId = new Map<
    number,
    { id: number; category: string; durationMinutes: number; order: number }
  >();

  for (const item of schedule) {
    if (!item || typeof item !== "object") continue;
    const row = item as {
      id?: unknown;
      category?: unknown;
      durationMinutes?: unknown;
      order?: unknown;
    };
    const id = Number(row.id);
    if (!Number.isFinite(id)) continue;

    const category = String(row.category ?? "import-noturgent");
    const durationMinutes = Number(row.durationMinutes ?? 25);
    const order = Number(row.order ?? 999);

    byId.set(id, {
      id,
      category: VALID_CATEGORIES.has(category) ? category : "import-noturgent",
      durationMinutes: Number.isFinite(durationMinutes)
        ? Math.min(180, Math.max(15, Math.round(durationMinutes)))
        : 25,
      order: Number.isFinite(order) ? Math.max(1, Math.round(order)) : 999,
    });
  }

  const merged = sourceTasks.map((task, index) => {
    const matched = byId.get(task.id);
    if (matched) return matched;
    return {
      id: task.id,
      category: task.category ?? "import-noturgent",
      durationMinutes: task.durationMinutes ?? 25,
      order: index + 1,
    };
  });

  const ranked = rankTasksForSchedule(
    merged.map(({ id, category, durationMinutes, order }) => ({
      id,
      category,
      durationMinutes,
      order,
    })),
    deadlinesById
  );

  return assignScheduleTimes(ranked, deadlinesById, availability, timezoneOffsetMinutes);
}

export async function POST(req: NextRequest) {
  const result = await requireUser(req);
  if (!result.ok) return result.response;

  const body = await req.json().catch(() => null);
  const incoming: unknown[] = Array.isArray(body?.tasks) ? body.tasks : [];
  const timezoneOffsetMinutes = parseTimezoneOffsetMinutes(body?.timezoneOffsetMinutes);
  if (timezoneOffsetMinutes === undefined) {
    return NextResponse.json(
      { error: "缺少客户端时区信息，请刷新页面后重试" },
      { status: 400 }
    );
  }

  const availability = parseAvailabilityFromBody(
    body?.availability,
    timezoneOffsetMinutes
  );

  if (!availability) {
    return NextResponse.json(
      { error: "请至少添加一个今天或未来几天的可用时间段" },
      { status: 400 }
    );
  }

  const sourceTasks = incoming.reduce<IncomingTask[]>((acc, item) => {
    if (!item || typeof item !== "object") return acc;
    const row = item as {
      id?: unknown;
      text?: unknown;
      durationMinutes?: unknown;
      category?: unknown;
      deadline?: unknown;
    };
    const id = Number(row.id);
    const text = String(row.text ?? "").trim();
    if (!Number.isFinite(id) || !text) return acc;
    acc.push({
      id,
      text,
      durationMinutes: Number(row.durationMinutes ?? 25),
      category: typeof row.category === "string" ? row.category : undefined,
      deadline:
        typeof row.deadline === "string" || row.deadline === null
          ? (row.deadline as string | null)
          : undefined,
    });
    return acc;
  }, []);

  if (sourceTasks.length === 0) {
    return NextResponse.json({ error: "请先添加至少一个任务" }, { status: 400 });
  }

  const schedulableTasks = sourceTasks.filter(
    (task) => !isTaskPastDeadline({ deadline: task.deadline ?? null })
  );

  if (schedulableTasks.length === 0) {
    return NextResponse.json(
      { error: "没有可排期的任务（待排任务均已过截止时间）" },
      { status: 400 }
    );
  }

  const missingDeadline = schedulableTasks.filter((task) => !task.deadline);
  if (missingDeadline.length > 0) {
    return NextResponse.json(
      { error: "请为每个待排期任务填写截止时间（deadline）" },
      { status: 400 }
    );
  }

  const buildResponse = (schedule: AiScheduleItem[], unscheduledIds: number[], source: string) => {
    const unscheduledTasks = schedulableTasks
      .filter((task) => unscheduledIds.includes(task.id))
      .map((task) => ({ id: task.id, text: task.text }));
    return NextResponse.json({ schedule, unscheduledIds, unscheduledTasks, source });
  };

  const runSchedule = (parsed: unknown) => {
    const { schedule, unscheduledIds } = normalizeSchedule(
      parsed,
      schedulableTasks,
      availability,
      timezoneOffsetMinutes
    );
    return { schedule, unscheduledIds };
  };

  if (!isLlmConfigured()) {
    const { schedule, unscheduledIds } = buildFallbackScheduleFromTasks(
      schedulableTasks,
      availability,
      timezoneOffsetMinutes
    );
    return buildResponse(schedule, unscheduledIds, "fallback");
  }

  const userPayload = JSON.stringify(
    { availability, tasks: schedulableTasks },
    null,
    2
  );

  try {
    const rawText = await llmChatCompletion([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPayload },
    ]);
    const parsed = extractJsonObject(rawText) as { schedule?: unknown };
    const { schedule, unscheduledIds } = runSchedule(parsed);

    return buildResponse(schedule, unscheduledIds, "ai");
  } catch (err) {
    console.error("AI schedule error:", err);
    const { schedule, unscheduledIds } = buildFallbackScheduleFromTasks(
      schedulableTasks,
      availability,
      timezoneOffsetMinutes
    );
    return buildResponse(schedule, unscheduledIds, "fallback");
  }
}
