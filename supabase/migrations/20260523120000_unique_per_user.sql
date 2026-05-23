-- Remove duplicate rows (keep oldest by created_at / id) before adding uniqueness rules.

DELETE FROM public.subjects a
USING public.subjects b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.subject_name = b.subject_name;

DELETE FROM public.exams a
USING public.exams b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.subject = b.subject
  AND a.exam_date = b.exam_date;

DELETE FROM public.tasks a
USING public.tasks b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.title = b.title
  AND a.due_date IS NOT DISTINCT FROM b.due_date;

-- One subject name per user
ALTER TABLE public.subjects
  ADD CONSTRAINT subjects_user_name_unique UNIQUE (user_id, subject_name);

-- One exam per subject + date per user
ALTER TABLE public.exams
  ADD CONSTRAINT exams_user_subject_date_unique UNIQUE (user_id, subject, exam_date);

-- One task per title + due date per user (due_date set)
CREATE UNIQUE INDEX tasks_user_title_due_unique
  ON public.tasks (user_id, title, due_date)
  WHERE due_date IS NOT NULL;

-- One task per title when no due date
CREATE UNIQUE INDEX tasks_user_title_no_due_unique
  ON public.tasks (user_id, title)
  WHERE due_date IS NULL;
