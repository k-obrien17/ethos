-- Add parent_id for threaded comment replies
ALTER TABLE public.answer_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.answer_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_answer_comments_parent ON public.answer_comments(parent_id);
