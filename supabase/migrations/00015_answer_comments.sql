-- ============================================================
-- Answer comments — threaded discussion on answers
-- ============================================================

CREATE TABLE public.answer_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID NOT NULL REFERENCES public.answers (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Denormalized comment count on answers
ALTER TABLE public.answers ADD COLUMN comment_count INT NOT NULL DEFAULT 0;

-- RLS
ALTER TABLE public.answer_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON public.answer_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can comment"
  ON public.answer_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.answer_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_answer_comments_answer ON public.answer_comments (answer_id, created_at);
CREATE INDEX idx_answer_comments_user ON public.answer_comments (user_id);

-- RPC: atomic increment/decrement comment_count
CREATE OR REPLACE FUNCTION public.increment_comment_count(p_answer_id UUID)
RETURNS void AS $$
  UPDATE public.answers SET comment_count = comment_count + 1 WHERE id = p_answer_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrement_comment_count(p_answer_id UUID)
RETURNS void AS $$
  UPDATE public.answers SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = p_answer_id;
$$ LANGUAGE sql SECURITY DEFINER;
