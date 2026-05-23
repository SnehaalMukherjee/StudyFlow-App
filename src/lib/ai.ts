import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AiTool = "planner" | "summarizer" | "viva";

export type AiPayload = Record<string, string>;

async function readFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError && error.context) {
    try {
      const body = await error.context.json();
      if (typeof body?.error === "string" && body.error) return body.error;
    } catch {
      /* ignore parse errors */
    }
  }

  if (error instanceof Error) {
    if (error.message.includes("Failed to send a request to the Edge Function")) {
      return "AI function not deployed. Run: npx supabase functions deploy ai-tools";
    }
    return error.message;
  }

  return "AI request failed. Try again.";
}

export async function generateWithAi(tool: AiTool, payload: AiPayload): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ result?: string; error?: string }>("ai-tools", {
    body: { tool, payload },
  });

  if (data?.error) throw new Error(data.error);
  if (data?.result) return data.result;

  if (error) {
    throw new Error(await readFunctionError(error));
  }

  throw new Error("No response from AI. Try again.");
}
