/** Postgres unique_violation */
const DUPLICATE_CODE = "23505";

const DUPLICATE_MESSAGES = {
  task: "A task with this title and due date already exists.",
  exam: "You already have an exam for this subject on that date.",
  subject: "You already track a subject with this name.",
} as const;

export type DuplicateContext = keyof typeof DUPLICATE_MESSAGES;

export function getDbErrorMessage(
  error: { code?: string; message?: string } | null,
  context?: DuplicateContext,
): string {
  if (!error) return "Something went wrong";
  const isDuplicate =
    error.code === DUPLICATE_CODE ||
    /duplicate key|unique constraint/i.test(error.message ?? "");
  if (isDuplicate && context) {
    return DUPLICATE_MESSAGES[context];
  }
  return error.message ?? "Something went wrong";
}

export function duplicateMessage(context: DuplicateContext): string {
  return DUPLICATE_MESSAGES[context];
}
