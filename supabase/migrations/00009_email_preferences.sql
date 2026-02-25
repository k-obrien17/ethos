-- ============================================================
-- Email notification preferences + unsubscribe token
-- ============================================================
-- Adds email preference toggles (JSONB) and a unique unsubscribe
-- token (UUID) to each profile. JSONB allows flexible preference
-- keys without schema changes for new email types.

-- Add email preferences and unsubscribe token to profiles
ALTER TABLE public.profiles
  ADD COLUMN email_preferences JSONB NOT NULL DEFAULT '{"daily_question":true,"weekly_recap":true,"budget_reset":true,"featured_answer":true}'::jsonb,
  ADD COLUMN unsubscribe_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;

-- Backfill unsubscribe tokens for existing profiles
UPDATE public.profiles
  SET unsubscribe_token = gen_random_uuid()::text
  WHERE unsubscribe_token IS NULL;

-- Make unsubscribe_token NOT NULL after backfill
ALTER TABLE public.profiles
  ALTER COLUMN unsubscribe_token SET NOT NULL;

-- Index for unsubscribe token lookups
CREATE INDEX idx_profiles_unsubscribe_token ON public.profiles (unsubscribe_token);
