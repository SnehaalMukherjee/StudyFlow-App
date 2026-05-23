import { supabase } from "@/integrations/supabase/client";
import { touchStreak } from "@/lib/streaks";

export const POMODORO_FOCUS_MINUTES = 25;

export async function logPomodoroFocusSession(userId: string, subject: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("study_sessions").insert({
    user_id: userId,
    subject: subject.trim() || "Pomodoro",
    duration_minutes: POMODORO_FOCUS_MINUTES,
    session_date: today,
  });
  if (error) throw error;
  await touchStreak(userId);
}

export async function countTodayFocusSessions() {
  const today = new Date().toISOString().slice(0, 10);
  const { count, error } = await supabase
    .from("study_sessions")
    .select("*", { count: "exact", head: true })
    .eq("session_date", today)
    .eq("duration_minutes", POMODORO_FOCUS_MINUTES);
  if (error) throw error;
  return count ?? 0;
}
