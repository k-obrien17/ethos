-- Add answer cap per question and answer window to questions table
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS answer_cap INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS answer_deadline TIMESTAMPTZ DEFAULT NULL;

-- answer_cap: max number of answers allowed per question (null = unlimited)
-- answer_deadline: timestamp after which no new answers accepted (null = no deadline)

COMMENT ON COLUMN public.questions.answer_cap IS 'Max answers per question (null = unlimited)';
COMMENT ON COLUMN public.questions.answer_deadline IS 'Deadline for submitting answers (null = no deadline)';

-- Add description field to topics for SEO blurbs
-- (description column already exists from 00012_topics.sql, but may be empty)

-- Add organization field to profiles for company visibility (may already exist)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organization TEXT DEFAULT NULL;

-- Add beta_mode site setting
INSERT INTO public.site_settings (key, value)
VALUES ('beta_mode', 'true')
ON CONFLICT (key) DO NOTHING;

-- Add default_answer_cap site setting (null means use per-question cap only)
INSERT INTO public.site_settings (key, value)
VALUES ('default_answer_cap', '15')
ON CONFLICT (key) DO NOTHING;

-- Add default_answer_window_days site setting
INSERT INTO public.site_settings (key, value)
VALUES ('default_answer_window_days', '3')
ON CONFLICT (key) DO NOTHING;
