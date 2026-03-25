-- Add approval status to profiles for invite vetting
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'suspended'));

-- New signups via invite will be set to 'pending' in the auth callback
-- Admin-created invites auto-approve; expert-created invites require vetting

COMMENT ON COLUMN public.profiles.status IS 'pending = awaiting admin approval, approved = can submit answers, suspended = blocked';

-- Add engagement_score for relegation ranking (updated periodically or on answer activity)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS engagement_score REAL NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.engagement_score IS 'Computed score based on avg likes, comments, views across recent answers. Higher = more visible.';

-- Index for efficient sorting by engagement
CREATE INDEX IF NOT EXISTS idx_profiles_engagement ON public.profiles (engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);

-- RPC to recompute engagement scores for all experts
CREATE OR REPLACE FUNCTION public.recompute_engagement_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expert RECORD;
  score REAL;
BEGIN
  FOR expert IN
    SELECT DISTINCT expert_id FROM answers
  LOOP
    SELECT COALESCE(
      AVG(
        (a.like_count * 3) +
        (a.comment_count * 2) +
        (a.view_count * 0.1)
      ), 0
    )
    INTO score
    FROM answers a
    WHERE a.expert_id = expert.expert_id
      AND a.created_at > NOW() - INTERVAL '90 days'
      AND a.hidden_at IS NULL;

    UPDATE profiles
    SET engagement_score = score
    WHERE id = expert.expert_id;
  END LOOP;
END;
$$;

-- Run it once to populate initial scores
SELECT public.recompute_engagement_scores();
