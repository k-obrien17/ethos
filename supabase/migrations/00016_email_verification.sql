-- Add email verification fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN email_verified_at TIMESTAMPTZ,
  ADD COLUMN email_verify_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;

-- Existing users who signed up via OAuth are considered verified
UPDATE public.profiles SET email_verified_at = NOW();
