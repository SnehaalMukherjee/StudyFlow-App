export function daysUntilExam(examDate: string, todayIso?: string): number {
  const today = todayIso ?? new Date().toISOString().slice(0, 10);
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  const d = new Date(examDate);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86_400_000);
}

/** Exam is today or within the next 7 days (not past). */
export function isExamDueSoon(examDate: string, todayIso?: string): boolean {
  const days = daysUntilExam(examDate, todayIso);
  return days >= 0 && days <= 7;
}

export function examDueSoonLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}
