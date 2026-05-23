import { supabase } from "@/integrations/supabase/client";

export async function hasDuplicateExam(
  userId: string,
  subject: string,
  examDate: string,
  excludeId?: string,
): Promise<boolean> {
  let q = supabase
    .from("exams")
    .select("id")
    .eq("user_id", userId)
    .eq("subject", subject.trim())
    .eq("exam_date", examDate);

  if (excludeId) q = q.neq("id", excludeId);

  const { data, error } = await q.limit(1).maybeSingle();
  if (error) throw error;
  return data !== null;
}
