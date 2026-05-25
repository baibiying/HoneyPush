import { NextRequest, NextResponse } from "next/server";
import { ai } from "@eazo/sdk";
import { requireAuth } from "@/lib/auth";

ai.configure({ privateKey: process.env.EAZO_PRIVATE_KEY! });

const SYSTEM_PROMPT = `你是一个效率规划专家，擅长使用艾森豪威尔四象限原则对任务进行分类排期。
用户会给你一段自然语言描述的待办事项，你需要：
1. 将其拆分为具体的可执行任务（每个任务约25分钟番茄钟）
2. 为每个任务分配四象限类别：
   - import-urgent（A象限：重要且紧急）
   - import-noturgent（B象限：重要不紧急）
   - notimport-urgent（C象限：不重要但紧急）
   - notimport-noturgent（D象限：不重要不紧急）
3. 返回JSON格式：{"tasks": [{"text": "任务名称", "category": "类别", "durationMinutes": 25}]}
只返回JSON，不要其他说明文字。`;

export async function POST(req: NextRequest) {
  const result = requireAuth(req);
  if (!result.ok) return result.response;

  const body = await req.json();
  const userInput = body.input as string;

  if (!userInput?.trim()) {
    return NextResponse.json({ error: "input is required" }, { status: 400 });
  }

  try {
    const completion = await ai.chat({
      model: "deepseek.v3.1",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userInput },
      ],
    });

    const rawText = completion.choices[0].message.content ?? "{}";
    // Extract JSON from response (sometimes wrapped in ```json ... ```)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { tasks: [] };

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("AI schedule error:", err);
    return NextResponse.json({ error: "AI 解析失败" }, { status: 500 });
  }
}
