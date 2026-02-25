-- ============================================================
-- Answer moderation: soft-hide infrastructure
-- ============================================================
-- Adds hidden_at / hidden_by columns so admins can hide published
-- answers without deleting them. Updates RLS policies to exclude
-- hidden answers from public reads and prevent experts from
-- modifying hidden answers.

-- Add soft-hide columns for answer moderation
ALTER TABLE public.answers
  ADD COLUMN hidden_at TIMESTAMPTZ,
  ADD COLUMN hidden_by UUID REFERENCES public.profiles(id);

-- Update public read policy to exclude hidden answers
DROP POLICY "Answers are publicly readable" ON public.answers;
CREATE POLICY "Visible answers are publicly readable"
  ON public.answers FOR SELECT
  USING (hidden_at IS NULL);

-- Admins can still read all answers (including hidden) for moderation
CREATE POLICY "Admins can read all answers"
  ON public.answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Tighten expert's own UPDATE policy: experts can update their own answers
-- BUT only if the answer is not hidden (prevents experts from clearing hidden_at)
DROP POLICY "Users can update own answers" ON public.answers;
CREATE POLICY "Users can update own visible answers"
  ON public.answers FOR UPDATE
  USING (auth.uid() = expert_id AND hidden_at IS NULL)
  WITH CHECK (auth.uid() = expert_id AND hidden_at IS NULL);

-- Admins can update any answer (to set/clear hidden_at)
CREATE POLICY "Admins can update answers"
  ON public.answers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Index for filtering hidden answers efficiently
CREATE INDEX idx_answers_hidden ON public.answers (hidden_at)
  WHERE hidden_at IS NOT NULL;
