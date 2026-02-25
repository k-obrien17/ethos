-- ============================================================
-- Featured answers: editorial pick infrastructure
-- ============================================================
-- Adds featured_at / featured_by columns so admins can mark
-- one answer per question as featured. UNIQUE partial index
-- enforces the one-per-question constraint at DB level.

-- Add featured columns (same pattern as hidden_at/hidden_by)
ALTER TABLE public.answers
  ADD COLUMN featured_at TIMESTAMPTZ,
  ADD COLUMN featured_by UUID REFERENCES public.profiles(id);

-- Enforce: at most one featured answer per question
CREATE UNIQUE INDEX idx_answers_featured_question
  ON public.answers (question_id)
  WHERE featured_at IS NOT NULL;

-- Index for efficient featured answer lookups
CREATE INDEX idx_answers_featured
  ON public.answers (featured_at)
  WHERE featured_at IS NOT NULL;
