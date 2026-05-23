-- Fix task uniqueness: same title + same calendar day (UTC) per user.

DROP INDEX IF EXISTS public.tasks_user_title_due_unique;
DROP INDEX IF EXISTS public.tasks_user_title_due_day_unique;

-- Immutable helper (required for unique indexes on expressions)
CREATE OR REPLACE FUNCTION public.task_due_utc_day(ts timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT (ts AT TIME ZONE 'UTC')::date;
$$;

DELETE FROM public.tasks a
USING public.tasks b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.title = b.title
  AND public.task_due_utc_day(a.due_date) IS NOT DISTINCT FROM public.task_due_utc_day(b.due_date);

CREATE UNIQUE INDEX tasks_user_title_due_day_unique
  ON public.tasks (user_id, title, (public.task_due_utc_day(due_date)))
  WHERE due_date IS NOT NULL;
