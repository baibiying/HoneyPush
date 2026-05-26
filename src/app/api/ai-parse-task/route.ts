import { NextRequest, NextResponse } from "next/server";
import {
  extractJsonObject,
  isLlmConfigured,
  llmChatCompletion,
} from "@/lib/ai/llm-chat";
import {
  applyDurationFromNaturalLanguage,
  fallbackParseTasksFromNaturalLanguage,
  normalizeParsedTasks,
  type ParsedTaskDraft,
} from "@/lib/ai/parse-task";
import { parseTimezoneOffsetMinutes } from "@/lib/ai/timezone";
import { requireUser } from "@/lib/auth/session";

const SYSTEM_PROMPT = `你是任务解析助手。用户会用自然语言（中文为主）描述待办，可能一次提到多个任务。
请提取结构化信息，返回 JSON：
{
  "tasks": [
    {
      "text": "仅任务事项名称（名词短语，如「英语语法作业」「交互设计稿」），不要带写完/完成/提交等动词，也不含时间或时长",
      "category": "四象限之一：import-urgent | import-noturgent | notimport-urgent | notimport-noturgent",
      "durationMinutes": 15-180 的整数，表示预计专注用时（默认 25）,
      "deadline": "ISO 8601 格式的截止时间（UTC），结合用户提到的今天/明天/周五/具体日期与 referenceLocal 理解"
    }
  ]
}
规则：
1. 能拆成多条就拆成多条（例如「周五交设计稿，明天写论文」→ 2 条）
2. category 判断：重要且紧急→import-urgent；重要不紧急→import-noturgent；紧急不重要→notimport-urgent；琐事→notimport-noturgent
3. 未说明用时则 durationMinutes=25；出现「1小时」「90分钟」等要换算成分钟
4. 未说明截止时间时，重要任务默认 referenceLocal 起 3 天后的 18:00（用户本地时区）
5. text 为事项名称本身，不要动词前缀。严禁包含截止时间、日期、星期、预计用时。例：「周四前得写完英语语法作业，预计2小时」→ text「英语语法作业」；「周五前要交交互设计稿，大概2小时」→ text「交互设计稿」
6. 只返回 JSON，不要解释`;

export async function POST(req: NextRequest) {
  const result = await requireUser(req);
  if (!result.ok) return result.response;

  const body = await req.json().catch(() => null);
  const naturalLanguage = String(body?.naturalLanguage ?? "").trim();
  if (!naturalLanguage) {
    return NextResponse.json({ error: "请输入任务描述" }, { status: 400 });
  }

  const timezoneOffsetMinutes =
    parseTimezoneOffsetMinutes(body?.timezoneOffsetMinutes) ??
    new Date().getTimezoneOffset();

  const referenceLocal =
    typeof body?.referenceLocal === "string" && body.referenceLocal.trim()
      ? body.referenceLocal.trim()
      : new Date().toISOString();

  const buildResponse = (tasks: ParsedTaskDraft[], source: "ai" | "fallback") =>
    NextResponse.json({ tasks, source });

  if (!isLlmConfigured()) {
    return buildResponse(
      fallbackParseTasksFromNaturalLanguage(naturalLanguage, timezoneOffsetMinutes),
      "fallback"
    );
  }

  const userPayload = JSON.stringify(
    {
      naturalLanguage,
      referenceLocal,
      timezoneOffsetMinutes,
      categoryGuide: {
        "import-urgent": "重要且紧急",
        "import-noturgent": "重要不紧急",
        "notimport-urgent": "紧急不重要",
        "notimport-noturgent": "不重要不紧急",
      },
    },
    null,
    2
  );

  try {
    const rawText = await llmChatCompletion([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPayload },
    ]);
    const parsed = extractJsonObject(rawText) as { tasks?: unknown };
    const tasks = applyDurationFromNaturalLanguage(
      normalizeParsedTasks(parsed?.tasks, timezoneOffsetMinutes),
      naturalLanguage
    );

    if (tasks.length === 0) {
      return buildResponse(
        fallbackParseTasksFromNaturalLanguage(naturalLanguage, timezoneOffsetMinutes),
        "fallback"
      );
    }

    return buildResponse(tasks, "ai");
  } catch (err) {
    console.error("AI parse task error:", err);
    return buildResponse(
      fallbackParseTasksFromNaturalLanguage(naturalLanguage, timezoneOffsetMinutes),
      "fallback"
    );
  }
}
