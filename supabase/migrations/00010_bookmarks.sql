-- ============================================================
-- Bookmarks table — users save questions for later
-- ============================================================

CREATE TABLE public.bookmarks (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

-- RLS: users can only manage their own bookmarks
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookmarks"
  ON public.bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
  ON public.bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON public.bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Index for dashboard query (user's bookmarks with question join)
CREATE INDEX idx_bookmarks_user ON public.bookmarks (user_id);

-- Add bookmark_live preference to email_preferences default
-- Update the column default for new profiles
ALTER TABLE public.profiles
  ALTER COLUMN email_preferences
  SET DEFAULT '{"daily_question":true,"weekly_recap":true,"budget_reset":true,"featured_answer":true,"bookmark_live":true}'::jsonb;

-- Backfill existing profiles with bookmark_live preference
UPDATE public.profiles
  SET email_preferences = email_preferences || '{"bookmark_live":true}'::jsonb
  WHERE NOT (email_preferences ? 'bookmark_live');
