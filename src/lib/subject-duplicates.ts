import { supabase } from "@/integrations/supabase/client";

export async function hasDuplicateSubject(
  userId: string,
  subjectName: string,
  excludeId?: string,
): Promise<boolean> {
  let q = supabase
    .from("subjects")
    .select("id")
    .eq("user_id", userId)
    .eq("subject_name", subjectName.trim());

  if (excludeId) q = q.neq("id", excludeId);

  const { data, error } = await q.limit(1).maybeSingle();
  if (error) throw error;
  return data !== null;
}
