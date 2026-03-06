-- Expert follow system
CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);

-- Follower/following counts on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS follower_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count INTEGER NOT NULL DEFAULT 0;

-- Social links on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Answer drafts table
CREATE TABLE public.answer_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read follows"
  ON public.follows FOR SELECT USING (true);

CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

CREATE POLICY "Users can manage own drafts"
  ON public.answer_drafts FOR ALL
  USING (auth.uid() = user_id);

-- RPC to increment/decrement follow counts
CREATE OR REPLACE FUNCTION public.increment_follower_count(p_user_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.profiles SET follower_count = follower_count + 1 WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_follower_count(p_user_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_following_count(p_user_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.profiles SET following_count = following_count + 1 WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_following_count(p_user_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = p_user_id;
$$;

-- Add 'follow' to notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like', 'comment', 'featured', 'follow'));
