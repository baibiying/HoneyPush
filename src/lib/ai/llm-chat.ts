/**
 * OpenAI-compatible chat completions (OpenAI, DeepSeek, Moonshot, Groq, etc.).
 * Configure via LLM_* or OPENAI_* env vars on the server only.
 */

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function isLlmConfigured(): boolean {
  return Boolean(
    process.env.LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()
  );
}

function getLlmConfig() {
  const apiKey =
    process.env.LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const baseUrl = (
    process.env.LLM_BASE_URL?.trim() ||
    process.env.OPENAI_BASE_URL?.trim() ||
    "https://api.openai.com/v1"
  ).replace(/\/$/, "");

  const model =
    process.env.LLM_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini";

  return { apiKey, baseUrl, model };
}

/** Extract the first JSON object from an LLM reply. */
export function extractJsonObject(raw: string): unknown {
  const text = raw.trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]);
    } catch {
      return {};
    }
  }
}

/**
 * Non-streaming chat completion; returns assistant message text.
 */
export async function llmChatCompletion(
  messages: LlmMessage[],
  options?: { model?: string; temperature?: number }
): Promise<string> {
  const config = getLlmConfig();
  if (!config) {
    throw new Error(
      "LLM not configured. Set LLM_API_KEY (or OPENAI_API_KEY) in the server environment."
    );
  }

  const model = options?.model ?? config.model;
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.2,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `LLM request failed (${res.status}): ${detail.slice(0, 300) || res.statusText}`
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : "";
}
