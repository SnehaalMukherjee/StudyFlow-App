import { supabase } from "@/integrations/supabase/client";

/** Calendar day from ISO / timestamptz string, or null. */
export function dueDateDay(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

/** Normalize date input for consistent DB storage (UTC midnight). */
export function normalizeTaskDueDate(dueDate: string): string {
  return `${dueDate}T00:00:00.000Z`;
}

/** True if another task exists with the same title and due calendar day. */
export async function hasDuplicateTask(
  userId: string,
  title: string,
  dueDateInput: string,
  excludeTaskId?: string,
): Promise<boolean> {
  const trimmed = title.trim();
  const dueDay = dueDateInput ? dueDateInput : null;

  const { data, error } = await supabase
    .from("tasks")
    .select("id, due_date")
    .eq("user_id", userId)
    .eq("title", trimmed);

  if (error) throw error;
  if (!data?.length) return false;

  return data.some((row) => {
    if (excludeTaskId && row.id === excludeTaskId) return false;
    return dueDateDay(row.due_date) === dueDay;
  });
}
