// web/src/src/lib/llm.ts
import OpenAI from "openai";

export function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");
  return new OpenAI({ apiKey: key });
}

const DRY = process.env.OPENAI_DRY_RUN === "1";

export async function embedding(text: string): Promise<number[]> {
  if (DRY) {
    // 1536-dim zero vector
    return Array.from({ length: 1536 }, () => 0);
  }
  const client = getOpenAI();
  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000),
  });
  return res.data[0].embedding;
}

export async function chatJSON(system: string, user: string): Promise<any> {
  if (DRY) {
    // Return an empty shape that your route can handle
    return { claims: [] };
  }
  const client = getOpenAI();
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const txt = res.choices?.[0]?.message?.content || "{}";
  return JSON.parse(txt);
}
