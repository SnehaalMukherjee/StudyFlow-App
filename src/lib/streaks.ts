import { supabase } from "@/integrations/supabase/client";

/** Call after any study activity to update the user's daily streak. */
export async function touchStreak(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from("streaks").select("*").eq("user_id", userId).maybeSingle();

  if (!existing) {
    await supabase.from("streaks").insert({ user_id: userId, streak_count: 1, last_active_date: today });
    return 1;
  }
  if (existing.last_active_date === today) return existing.streak_count;

  const last = existing.last_active_date ? new Date(existing.last_active_date) : null;
  const diff = last ? Math.floor((new Date(today).getTime() - last.getTime()) / 86_400_000) : 99;
  const next = diff === 1 ? existing.streak_count + 1 : 1;
  await supabase.from("streaks").update({ streak_count: next, last_active_date: today }).eq("user_id", userId);
  return next;
}
