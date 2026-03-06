-- ============================================================
-- Answer likes — one upvote per user per answer
-- ============================================================

CREATE TABLE public.answer_likes (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  answer_id UUID NOT NULL REFERENCES public.answers (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, answer_id)
);

-- Denormalized like count on answers for fast reads
ALTER TABLE public.answers ADD COLUMN like_count INT NOT NULL DEFAULT 0;

-- RLS
ALTER TABLE public.answer_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
  ON public.answer_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like"
  ON public.answer_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own"
  ON public.answer_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_answer_likes_answer ON public.answer_likes (answer_id);
CREATE INDEX idx_answer_likes_user ON public.answer_likes (user_id);

-- Index for leaderboard query (expert ranking by total likes received)
CREATE INDEX idx_answers_expert_likes ON public.answers (expert_id, like_count);

-- RPC: atomic increment/decrement like_count
CREATE OR REPLACE FUNCTION public.increment_like_count(p_answer_id UUID)
RETURNS void AS $$
  UPDATE public.answers SET like_count = like_count + 1 WHERE id = p_answer_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrement_like_count(p_answer_id UUID)
RETURNS void AS $$
  UPDATE public.answers SET like_count = GREATEST(like_count - 1, 0) WHERE id = p_answer_id;
$$ LANGUAGE sql SECURITY DEFINER;
