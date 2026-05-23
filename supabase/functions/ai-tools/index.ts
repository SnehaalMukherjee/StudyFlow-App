import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lite / 1.5 often have separate free-tier quota from 2.0-flash
const GEMINI_MODELS = ["gemini-2.0-flash-lite", "gemini-1.5-flash", "gemini-2.0-flash"];
const GROQ_MODEL = "llama-3.1-8b-instant";

type AiTool = "planner" | "summarizer" | "viva";

interface AiRequest {
  tool: AiTool;
  payload: Record<string, string>;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildPrompt(tool: AiTool, payload: Record<string, string>): { system: string; user: string } {
  switch (tool) {
    case "planner": {
      const subjects = payload.subjects?.trim() ?? "";
      const hours = payload.hours?.trim() || "2";
      const exams = payload.exams?.trim() ?? "";
      return {
        system:
          "You are a helpful academic study planner for university and school students. " +
          "Write like a clean study guide: short title line, section headings on their own line, bullet lists with - . " +
          "Do not use ### or ** markdown symbols. Include short breaks between blocks. Keep advice actionable.",
        user:
          `Create a daily study plan.\n\n` +
          `Subjects: ${subjects}\n` +
          `Available study time today: ${hours} hours\n` +
          (exams ? `Upcoming exams: ${exams}\n` : "") +
          `\nAllocate time across subjects, prioritize exams if provided, and suggest what to focus on in each block.`,
      };
    }
    case "summarizer": {
      const text = (payload.text ?? "").slice(0, 12_000);
      return {
        system:
          "You are a study assistant that summarizes student notes clearly and accurately. " +
          "Format like a readable document: title on first line, then sections (Key Points, Examples, Review Tips) as plain headings on their own line, bullets with - . " +
          "Never use ###, ##, **, or === lines. Do not invent facts not present in the notes.",
        user: `Summarize these study notes:\n\n${text}`,
      };
    }
    case "viva": {
      const topic = payload.topic?.trim() ?? "";
      return {
        system:
          "You are an oral-exam (viva) coach for students. Generate exactly 8 question-and-answer pairs. " +
          "Use this exact format with incrementing numbers (Q1 through Q8). No markdown (#, **, ###). " +
          "Each answer should be 2–4 sentences a student can learn from. " +
          "Include definition, application, and critical-thinking questions.",
        user:
          `Topic: "${topic}"\n\n` +
          `Output exactly:\nQ1: [question]\nA1: [model answer]\n\nQ2: [question]\nA2: [model answer]\n\n` +
          `...through Q8 and A8.`,
      };
    }
  }
}

function parseGeminiError(status: number, errBody: string): string {
  try {
    const parsed = JSON.parse(errBody);
    const msg = parsed?.error?.message ?? parsed?.message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  } catch {
    /* use fallback */
  }
  if (status === 400) return "Invalid Gemini API key. Check GEMINI_API_KEY in Supabase secrets.";
  if (status === 403) return "Gemini API access denied. Enable the Generative Language API for your key.";
  if (status === 404) return "Gemini model not available. Redeploy the function after updating.";
  if (status === 429) return "quota_exceeded";
  return `Gemini API error (${status}). Check GEMINI_API_KEY and redeploy.`;
}

async function callGroq(apiKey: string, system: string, user: string) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    let msg = `Groq error (${res.status})`;
    try {
      const parsed = JSON.parse(raw);
      msg = parsed?.error?.message ?? msg;
    } catch { /* ignore */ }
    return { ok: false as const, status: res.status, error: msg };
  }

  let data: { choices?: { message?: { content?: string } }[] };
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false as const, status: 500, error: "Invalid JSON from Groq." };
  }

  const text = data?.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) {
    return { ok: false as const, status: 500, error: "Empty response from Groq." };
  }
  return { ok: true as const, text };
}

async function callGeminiOnce(model: string, apiKey: string, system: string, user: string) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    return { ok: false as const, status: res.status, error: parseGeminiError(res.status, raw) };
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false as const, status: 500, error: "Invalid JSON from Gemini." };
  }

  const parts = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    ?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.map((p) => p.text ?? "").join("").trim()
    : "";

  if (!text) {
    return { ok: false as const, status: 500, error: "Empty response from Gemini. Try shorter notes." };
  }

  return { ok: true as const, text };
}

async function callGemini(apiKey: string, system: string, user: string): Promise<string> {
  let quotaHit = false;
  let lastError = "Gemini request failed.";

  for (const model of GEMINI_MODELS) {
    const result = await callGeminiOnce(model, apiKey, system, user);
    if (result.ok) return result.text;
    lastError = result.error;
    console.error(`Gemini model ${model} failed:`, result.status, result.error);
    if (result.error === "quota_exceeded") {
      quotaHit = true;
      continue;
    }
    if (result.status === 404) continue;
    if (result.status === 400) break;
  }

  if (quotaHit) {
    throw new Error(
      "Gemini free quota is used up. Add a free GROQ_API_KEY (https://console.groq.com) in Supabase secrets, redeploy, or wait about an hour and retry.",
    );
  }
  throw new Error(lastError);
}

/** Groq first (separate free quota), then Gemini with model fallbacks. */
async function callAi(system: string, user: string): Promise<string> {
  const groqKey = Deno.env.get("GROQ_API_KEY")?.trim();
  const geminiKey = Deno.env.get("GEMINI_API_KEY")?.trim();

  if (groqKey) {
    const groq = await callGroq(groqKey, system, user);
    if (groq.ok) return groq.text;
    console.error("Groq failed:", groq.error);
  }

  if (geminiKey) {
    return await callGemini(geminiKey, system, user);
  }

  throw new Error(
    "No AI API key configured. Add GROQ_API_KEY (free, recommended) or GEMINI_API_KEY in Supabase → Edge Functions → Secrets, then redeploy ai-tools.",
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Please log in again." }, 401);
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      console.error("Auth error:", userError?.message);
      return jsonResponse({ error: "Session expired. Please log out and log in again." }, 401);
    }

    const body = (await req.json()) as AiRequest;
    const tool = body?.tool;
    const payload = body?.payload ?? {};

    if (!tool || !["planner", "summarizer", "viva"].includes(tool)) {
      return jsonResponse({ error: "Invalid tool" }, 400);
    }

    if (tool === "planner" && !payload.subjects?.trim()) {
      return jsonResponse({ error: "Add at least one subject." }, 400);
    }
    if (tool === "summarizer" && !payload.text?.trim()) {
      return jsonResponse({ error: "Paste some notes first." }, 400);
    }
    if (tool === "viva" && !payload.topic?.trim()) {
      return jsonResponse({ error: "Enter a topic first." }, 400);
    }

    const { system, user } = buildPrompt(tool, payload);
    const result = await callAi(system, user);
    return jsonResponse({ result });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Something went wrong";
    return jsonResponse({ error: message }, 500);
  }
});
