import { NextRequest, NextResponse } from "next/server";
import { ai } from "@eazo/sdk";
import {
  buildFallbackScheduleFromTasks,
  type AiScheduleItem,
} from "@/lib/ai/fallback-schedule";
import { parseAvailabilityFromBody } from "@/lib/ai/availability";
import { assignScheduleTimes } from "@/lib/ai/schedule-times";
import { requireUser } from "@/lib/auth/session";

const privateKey = process.env.EAZO_PRIVATE_KEY;
if (privateKey) {
  ai.configure({ privateKey });
}

const VALID_CATEGORIES = new Set([
  "import-urgent",
  "import-noturgent",
  "notimport-urgent",
  "notimport-noturgent",
]);

const SYSTEM_PROMPT = `你是一个效率规划专家，擅长根据任务截止时间、预计用时和用户可用时间段，为用户已有的任务列表做排期。
排期须遵循番茄钟：每段专注 25 分钟，段与段之间休息 5 分钟。durationMinutes 表示该任务预计需要完成多少分钟（用户填写的「预计用时」）。
用户会提供 availability（今天及未来几天可用于做事的日期与时段）和 tasks。你必须只在 availability 内安排任务；今天排不下则排到明天或更晚的 availability 时段（由系统自动换算具体时间）。
用户会提供一组已经创建的任务（包含 id、text、durationMinutes、deadline、category 等），你需要：
1. 为每个任务确认或调整四象限类别（category）：
   - import-urgent（A：重要且紧急）
   - import-noturgent（B：重要不紧急）
   - notimport-urgent（C：紧急不重要）
   - notimport-noturgent（D：不重要不紧急）
2. 为每个任务确认或调整合理的 durationMinutes（15-180，表示预计完成用时，默认 25）
3. 给出建议执行顺序 order（从1开始，数字越小越优先；越接近 deadline 的任务通常应更靠前）
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
  availability: import("@/lib/ai/availability").AvailabilitySlotInput[]
): { schedule: AiScheduleItem[]; unscheduledIds: number[] } {
  const deadlinesById = buildDeadlinesMap(sourceTasks);

  const baseFromFallback = () => buildFallbackScheduleFromTasks(sourceTasks, availability);

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

  return assignScheduleTimes(
    merged.map(({ id, category, durationMinutes, order }) => ({
      id,
      category,
      durationMinutes,
      order,
    })),
    deadlinesById,
    availability
  );
}

export async function POST(req: NextRequest) {
  const result = await requireUser(req);
  if (!result.ok) return result.response;

  const body = await req.json().catch(() => null);
  const incoming: unknown[] = Array.isArray(body?.tasks) ? body.tasks : [];
  const availability = parseAvailabilityFromBody(body?.availability);

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

  const missingDeadline = sourceTasks.filter((task) => !task.deadline);
  if (missingDeadline.length > 0) {
    return NextResponse.json(
      { error: "请为每个待排期任务填写截止时间（deadline）" },
      { status: 400 }
    );
  }

  const runSchedule = (parsed: unknown) => {
    const { schedule, unscheduledIds } = normalizeSchedule(parsed, sourceTasks, availability);
    return { schedule, unscheduledIds };
  };

  if (!privateKey) {
    const { schedule, unscheduledIds } = buildFallbackScheduleFromTasks(sourceTasks, availability);
    return NextResponse.json({ schedule, unscheduledIds, source: "fallback" });
  }

  const userPayload = JSON.stringify(
    { availability, tasks: sourceTasks },
    null,
    2
  );

  try {
    const completion = await ai.chat({
      model: "deepseek.v3.1",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPayload },
      ],
    });

    const rawText = completion.choices[0].message.content ?? "{}";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { schedule: [] };
    const { schedule, unscheduledIds } = runSchedule(parsed);

    return NextResponse.json({ schedule, unscheduledIds, source: "ai" });
  } catch (err) {
    console.error("AI schedule error:", err);
    const { schedule, unscheduledIds } = buildFallbackScheduleFromTasks(sourceTasks, availability);
    return NextResponse.json({ schedule, unscheduledIds, source: "fallback" });
  }
}
